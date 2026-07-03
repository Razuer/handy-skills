# Profile Format Notes

Use this only when the summarizer needs debugging or extension.

## Expected Layout

The sample export matches Firefox profiler JSON produced from Samply export workflows.

- Top-level `threads[]` contains sample arrays and thread metadata.
- Shared symbol tables live under top-level `shared`:
  - `shared.stackTable.prefix`
  - `shared.stackTable.frame`
  - `shared.frameTable.func`
  - `shared.funcTable.name`
  - `shared.stringArray`
- Each thread sample references a stack index through `thread.samples.stack[]`.

Reconstruct a call stack by following:

1. `thread.samples.stack[i]`
2. `shared.stackTable.prefix` chain for that stack index
3. `shared.stackTable.frame[stack_index]`
4. `shared.frameTable.func[frame_index]`
5. `shared.funcTable.name[func_index]`
6. `shared.stringArray[string_index]`

## Fallbacks

- Some profiles may keep tables on each thread instead of under `shared`.
- Some frames may lack a function name but have `frameTable.nativeSymbol` pointing into `shared.nativeSymbols.name`.
- Some sample entries can have a null stack and should be skipped.
- Use `samples.weight[]` if present, otherwise count each sample as `1`.

## Practical Checks

Use `jq 'keys' profile.json` to confirm top-level layout.

Use this to inspect the busiest thread structure:

```bash
jq '.threads[] | {name, sample_len: .samples.length}' profile.json
```

Use this to confirm shared tables exist:

```bash
jq '.shared | {keys: keys, stackTable: (.stackTable | keys), frameTable: (.frameTable | keys), funcTable: (.funcTable | keys)}' profile.json
```

If those checks do not match, patch the summarizer instead of trying to reason from the raw JSON manually.
