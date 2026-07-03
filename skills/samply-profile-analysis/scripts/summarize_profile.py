#!/usr/bin/env python3

import argparse
from dataclasses import dataclass
import json
import re
from collections import defaultdict
from pathlib import Path


DEFAULT_THREAD_LIMIT = 0
DEFAULT_FOCUSED_THREAD_LIMIT = 3
DEFAULT_OVERVIEW_LIMIT = 20
DEFAULT_MAX_NAME_LEN = 120
RUST_PATH_IN_GENERIC_RE = re.compile(
    r"(?<![A-Za-z0-9_])(?:[A-Za-z_][A-Za-z0-9_]*::)+([A-Za-z_][A-Za-z0-9_]*)"
)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Summarize a Samply/Firefox-profiler JSON export.",
    )
    parser.add_argument("profile", help="Path to exported profile JSON")
    parser.add_argument(
        "--thread",
        action="append",
        default=[],
        help="Only include threads whose name contains this substring; repeatable",
    )
    parser.add_argument(
        "--stack-match",
        help="Only count samples whose reconstructed stack matches this regex",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=10,
        help="Number of rows to show in each ranking",
    )
    parser.add_argument(
        "--thread-limit",
        type=int,
        default=None,
        help=(
            "How many non-empty matched threads to print detailed tables for; "
            "use 0 for overview only. Default is overview-only until --thread "
            "or --stack-match is provided"
        ),
    )
    parser.add_argument(
        "--all-threads",
        action="store_true",
        help="Print detailed tables for every matched non-empty thread",
    )
    parser.add_argument(
        "--overview-limit",
        type=int,
        default=DEFAULT_OVERVIEW_LIMIT,
        help="Maximum rows to print in the thread overview",
    )
    parser.add_argument(
        "--min-samples",
        type=int,
        default=1,
        help="Minimum matched samples required for detailed tables",
    )
    parser.add_argument(
        "--show-empty",
        action="store_true",
        help="Include empty or unmatched threads in the overview and detailed output",
    )
    parser.add_argument(
        "--stack-depth",
        type=int,
        default=8,
        help="How many frames to keep when printing a stack",
    )
    parser.add_argument(
        "--format",
        choices=["text", "markdown"],
        default="text",
        help="Render plain text or Markdown output",
    )
    parser.add_argument(
        "--full-names",
        action="store_true",
        help="Do not shorten long symbol names in rankings and stacks",
    )
    parser.add_argument(
        "--max-name-len",
        type=int,
        default=DEFAULT_MAX_NAME_LEN,
        help="Maximum displayed symbol length when names are compacted",
    )
    return parser.parse_args()


@dataclass
class ThreadSummary:
    index: int
    thread: dict
    total_samples: int
    raw_weight: float
    raw_cpu: float
    matched_samples: int
    matched_weight: float
    matched_cpu: float
    leaf_counter: dict
    inclusive_counter: dict
    stack_counter: dict

    @property
    def name(self):
        return self.thread.get("name", "<unnamed>")

    @property
    def pid_tid(self):
        return f"{self.thread.get('pid')} / {self.thread.get('tid')}"

    @property
    def has_detail(self):
        return self.matched_samples > 0


def load_json(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def get_tables(profile, thread):
    shared = profile.get("shared") or {}
    stack_table = shared.get("stackTable") or thread.get("stackTable") or {}
    frame_table = shared.get("frameTable") or thread.get("frameTable") or {}
    func_table = shared.get("funcTable") or thread.get("funcTable") or {}
    string_array = shared.get("stringArray") or thread.get("stringArray") or []
    native_symbols = shared.get("nativeSymbols") or thread.get("nativeSymbols") or {}
    return stack_table, frame_table, func_table, string_array, native_symbols


def safe_get(seq, index, default=None):
    if index is None:
        return default
    if index < 0 or index >= len(seq):
        return default
    return seq[index]


class ThreadResolver:
    def __init__(self, profile, thread):
        self.thread = thread
        (
            self.stack_table,
            self.frame_table,
            self.func_table,
            self.string_array,
            self.native_symbols,
        ) = get_tables(profile, thread)
        self.stack_prefix = self.stack_table.get("prefix") or []
        self.stack_frame = self.stack_table.get("frame") or []
        self.frame_func = self.frame_table.get("func") or []
        self.frame_native = self.frame_table.get("nativeSymbol") or []
        self.func_name = self.func_table.get("name") or []
        self.native_name = self.native_symbols.get("name") or []
        self.stack_cache = {}
        self.name_cache = {}

    def resolve_stack(self, stack_index):
        if stack_index is None:
            return []
        cached = self.stack_cache.get(stack_index)
        if cached is not None:
            return cached

        prefix = safe_get(self.stack_prefix, stack_index)
        frame_index = safe_get(self.stack_frame, stack_index)
        frames = list(self.resolve_stack(prefix)) if prefix is not None else []
        if frame_index is not None:
            frames.append(self.resolve_frame_name(frame_index))
        self.stack_cache[stack_index] = frames
        return frames

    def resolve_frame_name(self, frame_index):
        cached = self.name_cache.get(frame_index)
        if cached is not None:
            return cached

        func_index = safe_get(self.frame_func, frame_index)
        if func_index is not None:
            string_index = safe_get(self.func_name, func_index)
            name = safe_get(self.string_array, string_index)
            if name:
                self.name_cache[frame_index] = name
                return name

        native_index = safe_get(self.frame_native, frame_index)
        if native_index is not None:
            string_index = safe_get(self.native_name, native_index)
            name = safe_get(self.string_array, string_index)
            if name:
                self.name_cache[frame_index] = name
                return name

        fallback = f"<frame:{frame_index}>"
        self.name_cache[frame_index] = fallback
        return fallback


def iter_threads(profile, filters):
    filters = [item.lower() for item in filters]
    for thread in profile.get("threads", []):
        name = thread.get("name", "<unnamed>")
        if filters and not any(token in name.lower() for token in filters):
            continue
        yield thread


def sample_weight(samples, index):
    weights = samples.get("weight")
    if isinstance(weights, list):
        value = safe_get(weights, index, 1)
        return 1 if value is None else value
    return 1


def sample_cpu(samples, index):
    deltas = samples.get("threadCPUDelta")
    if not isinstance(deltas, list):
        return 0
    value = safe_get(deltas, index, 0)
    return 0 if value is None else value


def format_pct(value, total):
    if not total:
        return "0.0%"
    return f"{(100.0 * value / total):5.1f}%"


def trim_stack(frames, depth):
    if len(frames) <= depth:
        return frames
    keep_tail = max(1, depth - 1)
    return ["..."] + frames[-keep_tail:]


def compact_symbol(name, max_len):
    if max_len <= 0:
        return name

    compacted = name
    generic_start = name.find("<")
    if generic_start != -1:
        prefix = name[:generic_start]
        generic_suffix = name[generic_start:]
        generic_suffix = RUST_PATH_IN_GENERIC_RE.sub(r"\1", generic_suffix)
        compacted = f"{prefix}{generic_suffix}"
        if len(compacted) > max_len:
            compacted = f"{prefix}<...>"
    compacted = compacted.replace("closure_env#", "closure#")

    if len(compacted) <= max_len:
        return compacted
    if max_len <= 12:
        return compacted[:max_len]

    head_len = max(4, (max_len - 3) // 2)
    tail_len = max(4, max_len - head_len - 3)
    return f"{compacted[:head_len]}...{compacted[-tail_len:]}"


def render_symbol(name, args):
    if args.full_names:
        return name
    return compact_symbol(name, args.max_name_len)


def render_stack(stack, args):
    return " -> ".join(render_symbol(frame, args) for frame in stack)


def format_counter_rows(counter, total, top, formatter=None):
    rows = []
    items = sorted(counter.items(), key=lambda item: item[1], reverse=True)[:top]
    for index, (name, value) in enumerate(items, start=1):
        rendered = formatter(name) if formatter else name
        rows.append((index, value, format_pct(value, total), rendered))
    return rows


def print_counter_text(title, rows):
    print(title)
    if not rows:
        print("  (no data)")
        print()
        return

    for index, value, pct, rendered in rows:
        print(f"  {index:2}. {value:8.2f}  {pct}  {rendered}")
    print()


def print_counter_markdown(title, rows):
    print(f"### {title}")
    if not rows:
        print()
        print("No data.")
        print()
        return

    print()
    print("| # | Weight | Share | Frame / Stack |")
    print("| --- | ---: | ---: | --- |")
    for index, value, pct, rendered in rows:
        safe = markdown_escape(rendered)
        print(f"| {index} | {value:.2f} | {pct} | `{safe}` |")
    print()


def analyze_thread(profile, thread, args, stack_pattern, thread_index):
    resolver = ThreadResolver(profile, thread)
    samples = thread.get("samples") or {}
    stack_indexes = samples.get("stack") or []
    total_samples = len(stack_indexes)
    raw_weight = 0.0
    raw_cpu = 0.0
    matched_weight = 0.0
    matched_cpu = 0.0
    matched_samples = 0
    leaf_counter = defaultdict(float)
    inclusive_counter = defaultdict(float)
    stack_counter = defaultdict(float)

    for index, stack_index in enumerate(stack_indexes):
        weight = float(sample_weight(samples, index))
        raw_weight += weight
        raw_cpu += sample_cpu(samples, index)

        if stack_index is None:
            continue

        frames = resolver.resolve_stack(stack_index)
        if not frames:
            continue

        rendered_stack = " | ".join(frames)
        if stack_pattern and not stack_pattern.search(rendered_stack):
            continue

        matched_weight += weight
        matched_cpu += sample_cpu(samples, index)
        matched_samples += 1
        leaf_counter[frames[-1]] += weight
        for frame in set(frames):
            inclusive_counter[frame] += weight
        stack_counter[tuple(trim_stack(frames, args.stack_depth))] += weight

    return ThreadSummary(
        index=thread_index,
        thread=thread,
        total_samples=total_samples,
        raw_weight=raw_weight,
        raw_cpu=raw_cpu,
        matched_samples=matched_samples,
        matched_weight=matched_weight,
        matched_cpu=matched_cpu,
        leaf_counter=leaf_counter,
        inclusive_counter=inclusive_counter,
        stack_counter=stack_counter,
    )


def thread_sort_key(summary):
    return (summary.matched_cpu, summary.matched_weight, summary.matched_samples)


def non_empty_summaries(summaries, args):
    sorted_summaries = sorted(summaries, key=thread_sort_key, reverse=True)
    if args.show_empty:
        return sorted_summaries
    return [summary for summary in sorted_summaries if summary.has_detail]


def detail_summaries(summaries, args):
    eligible = [
        summary
        for summary in non_empty_summaries(summaries, args)
        if args.show_empty or summary.matched_samples >= args.min_samples
    ]
    if args.all_threads:
        return eligible, len(eligible)
    return eligible[: args.thread_limit], len(eligible)


def markdown_escape(value):
    return str(value).replace("|", "\\|").replace("`", "\\`")


def print_thread_overview_text(summaries, args):
    overview = non_empty_summaries(summaries, args)
    non_empty_count = sum(1 for summary in summaries if summary.has_detail)
    skipped_empty = len(summaries) - non_empty_count
    print(
        "Threads: "
        f"matched_filter={len(summaries)} non_empty={non_empty_count} "
        f"empty_or_unmatched={skipped_empty}"
    )
    if args.stack_match:
        print(f"Stack filter: {args.stack_match}")
    print()
    print(
        "Thread overview "
        f"(top {min(args.overview_limit, len(overview))} by matched CPU delta, then weight)"
    )
    if not overview:
        print("  (no non-empty matched threads)")
        print()
        return

    for rank, summary in enumerate(overview[: args.overview_limit], start=1):
        main = "main" if summary.thread.get("isMainThread", False) else "worker"
        print(
            f"  {rank:2}. cpu={summary.matched_cpu:9.0f}us "
            f"weight={summary.matched_weight:8.2f} "
            f"samples={summary.total_samples:5} matched={summary.matched_samples:5} "
            f"{main:6} {summary.name} pid/tid={summary.pid_tid}"
        )

    omitted = len(overview) - args.overview_limit
    if omitted > 0:
        print(f"  ... {omitted} more non-empty matched threads omitted")
    if skipped_empty > 0 and not args.show_empty:
        print(f"  skipped {skipped_empty} empty/unmatched threads; use --show-empty to include")
    print()


def print_thread_overview_markdown(summaries, args):
    overview = non_empty_summaries(summaries, args)
    non_empty_count = sum(1 for summary in summaries if summary.has_detail)
    skipped_empty = len(summaries) - non_empty_count
    print("## Thread Overview")
    print()
    print(
        f"- Matched threads: `{len(summaries)}`"
        f"\n- Non-empty matched threads: `{non_empty_count}`"
        f"\n- Empty or unmatched threads: `{skipped_empty}`"
    )
    if args.stack_match:
        print(f"- Stack filter: `{markdown_escape(args.stack_match)}`")
    print()

    if not overview:
        print("No non-empty matched threads.")
        print()
        return

    print("| # | Thread | CPU us | Weight | Samples | Matched | Main | PID/TID |")
    print("| --- | --- | ---: | ---: | ---: | ---: | --- | --- |")
    for rank, summary in enumerate(overview[: args.overview_limit], start=1):
        main = "yes" if summary.thread.get("isMainThread", False) else "no"
        print(
            f"| {rank} | `{markdown_escape(summary.name)}` "
            f"| {summary.matched_cpu:.0f} | {summary.matched_weight:.2f} "
            f"| {summary.total_samples} | {summary.matched_samples} "
            f"| {main} | `{markdown_escape(summary.pid_tid)}` |"
        )
    print()

    omitted = len(overview) - args.overview_limit
    if omitted > 0:
        print(f"Omitted `{omitted}` more non-empty matched threads from this overview.")
        print()
    if skipped_empty > 0 and not args.show_empty:
        print(f"Skipped `{skipped_empty}` empty/unmatched threads; use `--show-empty` to include.")
        print()


def product_thread_hint(summaries, product):
    if not product or product == "<unknown>":
        return None
    ranked = [
        summary
        for summary in sorted(summaries, key=thread_sort_key, reverse=True)
        if summary.has_detail
    ]
    for rank, summary in enumerate(ranked, start=1):
        if summary.name == product or product in summary.name:
            return rank, summary
    return None


def print_focus_hints_text(summaries, product, args):
    if args.thread:
        return
    hint = product_thread_hint(summaries, product)
    if not hint:
        return
    rank, summary = hint
    print("Focus hints")
    print(
        f"  - Product thread '{summary.name}' ranks #{rank}; "
        f"rerun with --thread \"{summary.name}\" --thread-limit 1 for focused app frames."
    )
    if not args.full_names:
        print("  - Symbol names are compacted by default; add --full-names for exact symbols.")
    print()


def print_focus_hints_markdown(summaries, product, args):
    if args.thread:
        return
    hint = product_thread_hint(summaries, product)
    if not hint:
        return
    rank, summary = hint
    print("## Focus Hints")
    print()
    print(
        f"- Product thread `{markdown_escape(summary.name)}` ranks `#{rank}`; "
        f"rerun with `--thread \"{markdown_escape(summary.name)}\" --thread-limit 1` "
        "for focused app frames."
    )
    if not args.full_names:
        print("- Symbol names are compacted by default; add `--full-names` for exact symbols.")
    print()


def print_thread_detail_text(summary, args):
    self_rows = format_counter_rows(
        summary.leaf_counter,
        summary.matched_weight,
        args.top,
        formatter=lambda name: render_symbol(name, args),
    )
    inclusive_rows = format_counter_rows(
        summary.inclusive_counter,
        summary.matched_weight,
        args.top,
        formatter=lambda name: render_symbol(name, args),
    )
    stack_rows = format_counter_rows(
        summary.stack_counter,
        summary.matched_weight,
        args.top,
        formatter=lambda stack: render_stack(stack, args),
    )

    print(f"Thread: {summary.name}")
    print(
        "  samples="
        f"{summary.total_samples} matched={summary.matched_samples} "
        f"weight={summary.matched_weight:.2f} cpu_delta_us={summary.matched_cpu:.0f} "
        f"pid/tid={summary.pid_tid}"
    )
    print()
    print_counter_text("Top self frames", self_rows)
    print_counter_text("Top inclusive frames", inclusive_rows)
    print_counter_text("Top stacks", stack_rows)


def print_thread_detail_markdown(summary, args):
    self_rows = format_counter_rows(
        summary.leaf_counter,
        summary.matched_weight,
        args.top,
        formatter=lambda name: render_symbol(name, args),
    )
    inclusive_rows = format_counter_rows(
        summary.inclusive_counter,
        summary.matched_weight,
        args.top,
        formatter=lambda name: render_symbol(name, args),
    )
    stack_rows = format_counter_rows(
        summary.stack_counter,
        summary.matched_weight,
        args.top,
        formatter=lambda stack: render_stack(stack, args),
    )

    print(f"## Thread `{markdown_escape(summary.name)}`")
    print()
    print(
        f"- Samples: `{summary.total_samples}` total, `{summary.matched_samples}` matched"
        f"\n- Total weight: `{summary.matched_weight:.2f}`"
        f"\n- CPU delta: `{summary.matched_cpu:.0f}` us"
        f"\n- PID/TID: `{markdown_escape(summary.pid_tid)}`"
    )
    print()
    print_counter_markdown("Top self frames", self_rows)
    print_counter_markdown("Top inclusive frames", inclusive_rows)
    print_counter_markdown("Top stacks", stack_rows)


def print_details_text(summaries, selected_count, args):
    if args.thread_limit == 0 and not args.all_threads:
        print("Detailed threads skipped (overview-only mode).")
        print("  Use --thread <name> or --thread-limit N to print frame and stack tables.")
        return
    if not summaries:
        print("Detailed threads: none selected.")
        print("  Lower --min-samples, remove --stack-match, or use --show-empty if needed.")
        return

    label = "all" if args.all_threads else f"top {len(summaries)} of {selected_count}"
    print(f"Detailed threads ({label} eligible by matched CPU delta, then weight)")
    print()
    for index, summary in enumerate(summaries):
        if index:
            print("=" * 80)
        print_thread_detail_text(summary, args)
    omitted = selected_count - len(summaries)
    if omitted > 0:
        print(f"Omitted {omitted} eligible threads; use --thread-limit N or --all-threads.")


def print_details_markdown(summaries, selected_count, args):
    if args.thread_limit == 0 and not args.all_threads:
        print("## Detailed Threads")
        print()
        print("Skipped in overview-only mode. Use `--thread <name>` or `--thread-limit N` to print frame and stack tables.")
        print()
        return
    if not summaries:
        print("## Detailed Threads")
        print()
        print("None selected. Lower `--min-samples`, remove `--stack-match`, or use `--show-empty` if needed.")
        print()
        return

    label = "all" if args.all_threads else f"top {len(summaries)} of {selected_count}"
    print(f"## Detailed Threads: {label} eligible")
    print()
    for index, summary in enumerate(summaries):
        if index:
            print("---")
            print()
        print_thread_detail_markdown(summary, args)
    omitted = selected_count - len(summaries)
    if omitted > 0:
        print(f"Omitted `{omitted}` eligible threads; use `--thread-limit N` or `--all-threads`.")


def validate_args(args):
    if args.thread_limit is None:
        if args.thread or args.stack_match:
            args.thread_limit = DEFAULT_FOCUSED_THREAD_LIMIT
        else:
            args.thread_limit = DEFAULT_THREAD_LIMIT
    if args.thread_limit < 0:
        raise SystemExit("--thread-limit must be >= 0")
    if args.overview_limit < 0:
        raise SystemExit("--overview-limit must be >= 0")
    if args.min_samples < 0:
        raise SystemExit("--min-samples must be >= 0")
    if args.top < 0:
        raise SystemExit("--top must be >= 0")
    if args.stack_depth < 1:
        raise SystemExit("--stack-depth must be >= 1")


def main():
    args = parse_args()
    validate_args(args)
    profile_path = Path(args.profile)
    profile = load_json(profile_path)

    stack_pattern = re.compile(args.stack_match) if args.stack_match else None
    product = (profile.get("meta") or {}).get("product", "<unknown>")
    interval = (profile.get("meta") or {}).get("interval")
    sample_units = (profile.get("meta") or {}).get("sampleUnits") or {}

    threads = list(iter_threads(profile, args.thread))
    if not threads:
        raise SystemExit("No threads matched the provided filters")

    summaries = [
        analyze_thread(profile, thread, args, stack_pattern, thread_index)
        for thread_index, thread in enumerate(threads)
    ]
    selected_details, selected_count = detail_summaries(summaries, args)

    if args.format == "markdown":
        print(f"# Samply Profile Summary: `{profile_path.name}`")
        print()
        print(
            f"- Product: `{product}`"
            f"\n- Interval: `{interval}`"
            f"\n- Units: time=`{sample_units.get('time')}`, cpu=`{sample_units.get('threadCPUDelta')}`, event_delay=`{sample_units.get('eventDelay')}`"
        )
        print()
        print_thread_overview_markdown(summaries, args)
        print_focus_hints_markdown(summaries, product, args)
        print_details_markdown(selected_details, selected_count, args)
    else:
        print(f"Profile: {profile_path}")
        print(f"Product: {product}")
        print(f"Interval: {interval}")
        print(
            "Units: "
            f"time={sample_units.get('time')} cpu={sample_units.get('threadCPUDelta')} "
            f"event_delay={sample_units.get('eventDelay')}"
        )
        print()
        print_thread_overview_text(summaries, args)
        print_focus_hints_text(summaries, product, args)
        print_details_text(selected_details, selected_count, args)


if __name__ == "__main__":
    main()
