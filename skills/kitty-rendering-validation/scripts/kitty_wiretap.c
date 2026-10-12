/* Linux-only diagnostic: count successful TTY writes for one exact executable.
 * cc -shared -fPIC -O2 -Wall -Wextra -Werror -pthread kitty_wiretap.c -o wiretap.so
 * KITTY_LAB_EXE=/absolute/app KITTY_LAB_COUNTER_DIR=/scratch/counters LD_PRELOAD=...
 * Output: five native-endian uint64_t values: bytes, calls, a=T, native a=p, c= a=p.
 */
#define _GNU_SOURCE
#include <fcntl.h>
#include <pthread.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/syscall.h>
#include <sys/uio.h>
#include <unistd.h>

static _Atomic uint64_t *counts;
static pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;
struct parser { unsigned state; size_t length; char header[2048]; };
static struct parser parsers[64];

__attribute__((constructor)) static void init(void) {
    const char *wanted = getenv("KITTY_LAB_EXE");
    const char *directory = getenv("KITTY_LAB_COUNTER_DIR");
    if (!wanted || !directory) return;
    char exe[4096], path[4096];
    ssize_t length = readlink("/proc/self/exe", exe, sizeof(exe) - 1);
    if (length < 0) return;
    exe[length] = 0;
    if (strcmp(wanted, exe)) return;
    int n = snprintf(path, sizeof(path), "%s/%d.counts", directory, getpid());
    if (n < 0 || (size_t)n >= sizeof(path)) return;
    int fd = open(path, O_RDWR | O_CREAT | O_EXCL | O_NOFOLLOW, 0600);
    if (fd < 0) return;
    if (ftruncate(fd, 5 * sizeof(uint64_t)) == 0) {
        void *p = mmap(NULL, 5 * sizeof(uint64_t), PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
        if (p != MAP_FAILED) counts = p;
    }
    close(fd);
}

static void finish_header(struct parser *p) {
    p->header[p->length] = 0;
    int transmit = 0, place = 0, cell_size = 0;
    char *save = NULL;
    for (char *token = strtok_r(p->header, ",", &save); token;
         token = strtok_r(NULL, ",", &save)) {
        if (!strcmp(token, "a=T")) transmit = 1;
        if (!strcmp(token, "a=p")) place = 1;
        if (!strncmp(token, "c=", 2)) cell_size = 1;
    }
    if (transmit) atomic_fetch_add(counts + 2, 1);
    if (place) atomic_fetch_add(counts + (cell_size ? 4 : 3), 1);
}

static void feed(int fd, const unsigned char *data, size_t length) {
    struct parser *p = parsers + fd;
    for (size_t i = 0; i < length; ++i) {
        unsigned char c = data[i];
        switch (p->state) {
        case 0: if (c == 27) p->state = 1; break;
        case 1: p->state = c == '_' ? 2 : c == 27 ? 1 : 0; break;
        case 2:
            p->state = c == 'G' ? 3 : c == 27 ? 1 : 0;
            p->length = 0;
            break;
        case 3:
            if (c == ';') { finish_header(p); p->state = 4; }
            else if (c == 27) p->state = 5;
            else if (p->length < sizeof(p->header) - 1) p->header[p->length++] = (char)c;
            else p->state = 4; /* Oversized/unrecognized header, skip payload. */
            break;
        case 4: if (c == 27) p->state = 5; break;
        case 5: p->state = c == '\\' ? 0 : c == 27 ? 5 : 4; break;
        }
    }
}

static int tracked(int fd) {
    return counts && fd >= 0 && fd < 64 && isatty(fd);
}

ssize_t write(int fd, const void *buffer, size_t length) {
    if (!tracked(fd)) return syscall(SYS_write, fd, buffer, length);
    pthread_mutex_lock(&lock);
    ssize_t written = syscall(SYS_write, fd, buffer, length);
    if (written > 0) {
        atomic_fetch_add(counts, (uint64_t)written);
        atomic_fetch_add(counts + 1, 1);
        feed(fd, buffer, (size_t)written);
    }
    pthread_mutex_unlock(&lock);
    return written;
}

ssize_t writev(int fd, const struct iovec *iov, int count) {
    if (!tracked(fd)) return syscall(SYS_writev, fd, iov, count);
    pthread_mutex_lock(&lock);
    ssize_t written = syscall(SYS_writev, fd, iov, count);
    if (written > 0) {
        atomic_fetch_add(counts, (uint64_t)written);
        atomic_fetch_add(counts + 1, 1);
        size_t left = (size_t)written;
        for (int i = 0; i < count && left; ++i) {
            size_t n = iov[i].iov_len < left ? iov[i].iov_len : left;
            feed(fd, iov[i].iov_base, n);
            left -= n;
        }
    }
    pthread_mutex_unlock(&lock);
    return written;
}
