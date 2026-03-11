(function () {
  const MONACO_VS = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs';
  let editor = null;
  let projectRoot = null;
  let openTabs = new Map();
  let activeTabId = null;
  let replProcessId = null;
  let runProcessId = null;
  let runWithOverlay = false;
  let overlayShapes = [];
  let overlayLineBuffer = '';
  function parseOverlayLine(line) {
    const t = line.replace(/^\s*OVERLAY:\s*/i, '').trim();
    if (t === 'clear') return { type: 'clear' };
    if (t === 'show') return { type: 'show' };
    if (t === 'hide') return { type: 'hide' };
    const parts = t.split(/\s+/);
    if (parts[0] === 'rect' && parts.length >= 5) return { type: 'rect', x: parseFloat(parts[1]), y: parseFloat(parts[2]), w: parseFloat(parts[3]), h: parseFloat(parts[4]), color: parts[5] || '#ff0000' };
    if (parts[0] === 'circle' && parts.length >= 4) return { type: 'circle', x: parseFloat(parts[1]), y: parseFloat(parts[2]), r: parseFloat(parts[3]), color: parts[4] || '#ff0000' };
    if (parts[0] === 'line' && parts.length >= 5) return { type: 'line', x1: parseFloat(parts[1]), y1: parseFloat(parts[2]), x2: parseFloat(parts[3]), y2: parseFloat(parts[4]), color: parts[5] || '#ff0000' };
    const textMatch = line.match(/OVERLAY:\s*text\s+(\d+)\s+(\d+)\s+"([^"]*)"\s*(.*)?/i) || line.match(/OVERLAY:\s*text\s+(\d+)\s+(\d+)\s+(\S+)\s*(.*)?/i);
    if (textMatch) return { type: 'text', x: parseInt(textMatch[1], 10), y: parseInt(textMatch[2], 10), text: textMatch[3] || '', color: (textMatch[4] || '').trim() || '#ffffff' };
    return null;
  }
  function applyOverlayCommand(cmd) {
    if (!cmd) return;
    if (cmd.type === 'clear') { overlayShapes = []; return; }
    if (cmd.type === 'show') { window.splIde.overlayShow(); return; }
    if (cmd.type === 'hide') { window.splIde.overlayHide(); return; }
    if (cmd.type === 'rect' || cmd.type === 'circle' || cmd.type === 'line' || cmd.type === 'text') overlayShapes.push(cmd);
    if (window.splIde.overlayDraw) window.splIde.overlayDraw(overlayShapes);
  }
  let terminalProcessId = null;
  let problems = [];
  let panelVisible = true;
  let statusBarTimer = null;
  let dirtyTimer = null;
  let validationTimer = null;
  let errorDecorations = [];
  let projectSymbolIndex = {};  // symbol name -> { definitions: [{ path, line, column, kind }] }
  const closedTabs = [];        // { path, content, dirty }[], max 10
  const MAX_CLOSED_TABS = 10;
  let editorFontSize = 14;
  let editorTabSize = 4;
  let lineNumbersVisible = true;
  let lastScriptArgs = [];
  let renderWhitespace = 'selection';
  let splVersionText = '';
  function on(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  }
  function debounceStatus() {
    if (statusBarTimer) clearTimeout(statusBarTimer);
    statusBarTimer = setTimeout(() => { updateStatusBar(); statusBarTimer = null; }, 100);
  }
  function debounceDirty() {
    if (dirtyTimer) clearTimeout(dirtyTimer);
    dirtyTimer = setTimeout(() => {
      if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; updateTabDirty(activeTabId); } }
      updateStatusBar();
      dirtyTimer = null;
    }, 150);
  }
  function debounceValidation() {
    if (validationTimer) clearTimeout(validationTimer);
    validationTimer = setTimeout(() => {
      runValidation();
      validationTimer = null;
    }, 1000);
  }
  async function runValidation() {
    const model = editor.getModel();
    if (!model || model.getLanguageId() !== 'spl') return;
    const source = model.getValue();
    if (!source.trim()) { problems = []; renderProblems(); return; }
    try {
      const stderr = await window.splIde.checkSource(source);
      parseErrorsFromStderr(stderr);
    } catch {
      problems = [];
      renderProblems();
    }
  }

  require.config({
    paths: { vs: MONACO_VS },
    'vs/nls': { availableLanguages: {} },
  });

  require(['vs/editor/editor.main'], function () {
    monaco.languages.register({ id: 'spl' });
    const BUILTINS = ['print', 'sqrt', 'pow', 'sin', 'cos', 'tan', 'random', 'floor', 'ceil', 'round', 'abs', 'min', 'max', 'str', 'int', 'float', 'array', 'len', 'push', 'read_file', 'write_file', 'time', 'inspect', 'type', 'dir', 'keys', 'values', 'has', 'upper', 'lower', 'replace', 'join', 'split', 'json_parse', 'json_stringify', 'cli_args', 'copy', 'freeze', 'deep_equal', 'random_choice', 'alloc', 'free', 'mem_copy', 'mem_set', 'mem_cmp', 'mem_move', 'realloc', 'ptr_offset', 'ptr_address', 'ptr_from_address', 'ptr_align_up', 'ptr_align_down', 'peek8', 'peek16', 'peek32', 'peek64', 'poke8', 'poke16', 'poke32', 'poke64', 'peek_float', 'poke_float', 'peek_double', 'poke_double', 'align_up', 'align_down', 'memory_barrier', 'volatile_load8', 'volatile_store8', 'volatile_load16', 'volatile_store16', 'volatile_load32', 'volatile_store32', 'volatile_load64', 'volatile_store64', 'range', 'map', 'filter', 'reduce', 'file_exists', 'list_dir', 'env_get', 'parse_int', 'parse_float', 'default', 'merge', 'slice', 'inspect_type', 'ptr_add', 'ptr_sub', 'is_aligned', 'mem_set_zero', 'ptr_tag', 'ptr_untag', 'ptr_get_tag', 'struct_define', 'offsetof_struct', 'sizeof_struct', 'pool_create', 'pool_alloc', 'pool_free', 'pool_destroy', 'read_be16', 'read_be32', 'read_be64', 'write_be16', 'write_be32', 'write_be64', 'read_le16', 'read_le32', 'read_le64', 'write_le16', 'write_le32', 'write_le64', 'alloc_zeroed', 'dump_memory', 'alloc_tracked', 'free_tracked', 'get_tracked_allocations', 'atomic_load32', 'atomic_store32', 'atomic_add32', 'atomic_cmpxchg32', 'map_file', 'unmap_file', 'memory_protect', 'Error', 'panic', 'error_message', 'error_name', 'error_cause', 'is_error_type', 'ValueError', 'TypeError', 'RuntimeError', 'OSError', 'KeyError', 'stack_trace', 'bytes_read', 'bytes_write', 'ptr_is_null', 'size_of_ptr', 'mem_swap', 'basename', 'dirname', 'path_join', 'ptr_eq', 'alloc_aligned', 'string_to_bytes', 'bytes_to_string', 'memory_page_size', 'mem_find', 'mem_fill_pattern', 'ptr_compare', 'mem_reverse', 'mem_scan', 'mem_overlaps', 'get_endianness', 'mem_is_zero', 'read_le_float', 'write_le_float', 'read_le_double', 'write_le_double', 'mem_count', 'ptr_min', 'ptr_max', 'ptr_diff', 'read_be_float', 'write_be_float', 'read_be_double', 'write_be_double', 'ptr_in_range', 'mem_xor', 'mem_zero',
      'readline', 'chr', 'ord', 'hex', 'bin', 'assert_eq',
      'base64_encode', 'base64_decode', 'uuid', 'hash_fnv', 'csv_parse', 'csv_stringify', 'time_format', 'stack_trace_array', 'is_nan', 'is_inf', 'env_all', 'escape_regex',
      'cwd', 'chdir', 'hostname', 'cpu_count', 'temp_dir', 'realpath', 'getpid', 'monotonic_time', 'file_size', 'env_set', 'glob',
      'is_string', 'is_array', 'is_map', 'is_number', 'is_function', 'round_to', 'insert_at', 'remove_at',
      'window_create', 'window_close', 'window_should_close', 'window_open', 'window_set_size', 'window_toggle_fullscreen',
      'clear', 'draw_rect', 'draw_circle', 'draw_line', 'draw_triangle', 'present',
      'load_image', 'draw_image', 'draw_image_ex',
      'key_down', 'key_pressed', 'key_released',
      'mouse_x', 'mouse_y', 'mouse_pressed', 'mouse_down',
      'set_target_fps', 'delta_time',
      'load_sound', 'play_sound',
      'draw_text', 'rect_collision', 'circle_collision', 'set_pixel', 'game_loop',
      'camera_set', 'camera_zoom', 'get_fps', 'debug_overlay',
      'set_master_volume', 'bind_action', 'action_pressed', 'action_down',
      'is_gamepad_available', 'gamepad_axis', 'gamepad_button_down', 'gamepad_button_pressed'];
    monaco.languages.setMonarchTokensProvider('spl', {
      defaultToken: 'identifier',
      tokenPostfix: '.spl',
      keywords: ['let', 'const', 'var', 'def', 'return', 'if', 'elif', 'else', 'for', 'in', 'range', 'while', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'rethrow', 'match', 'case', 'true', 'false', 'null', 'nil', 'function', 'class', 'new', 'this', 'super', 'import', 'export', 'defer', 'assert', 'repeat', 'lambda', 'do', 'step', 'self'],
      operatorWords: ['and', 'or'],
      typeKeywords: ['int', 'float', 'string', 'bool', 'void'],
      builtins: BUILTINS,
      tokenizer: {
        root: [
          [/[a-zA-Z_]\w*/, { cases: { '@operatorWords': 'keyword.operator', '@keywords': 'keyword', '@typeKeywords': 'type', '@builtins': 'support.function.builtin', '@default': 'identifier' } }],
          [/\b_\b/, 'variable.parameter'],
          [/0[xX][0-9a-fA-F][0-9a-fA-F_]*\b/, 'number.hex'],
          [/0[bB][01][01_]*\b/, 'number.hex'],
          [/\d+\.\d+([eE][+-]?\d+)?(s|ms|m|h)?\b/, 'number.float'],
          [/\.\d+([eE][+-]?\d+)?(s|ms|m|h)?\b/, 'number.float'],
          [/\d[\d_]*\.?[\d_]*([eE][+-]?\d+)?(s|ms|m|h)?\b/, 'number'],
          [/f"/, 'string.interpolated', '@fstring_double'],
          [/f'/, 'string.interpolated', '@fstring_single'],
          [/"/, 'string', '@string_double'],
          [/'/, 'string', '@string_single'],
          [/\/\/\/.*$/, 'comment.doc'],
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@block'],
          [/\.\.\.|\.\./, 'operator'],
          [/=>|\|>/, 'operator.special'],
          [/[=!<>]=?|[+*\/%]=?|&&|\|\||\?\?|\?\.?|\*\*|&|<<|>>|\^|\||&=|\|=|\^=|<<=|>>=/, 'operator'],
          [/[{}()\[\],;:.]/, 'delimiter'],
        ],
        string_double: [
          [/\\[\\"'nrt]/, 'string.escape'],
          [/[^"\\]+/, 'string'],
          [/"/, 'string', '@pop'],
        ],
        string_single: [
          [/\\[\\"'nrt]/, 'string.escape'],
          [/[^'\\]+/, 'string'],
          [/'/, 'string', '@pop'],
        ],
        fstring_double: [
          [/\\[\\"'nrt]/, 'string.escape'],
          [/\{[^}]*\}/, 'string.interpolation'],
          [/[^"\\{]+/, 'string'],
          [/"/, 'string.interpolated', '@pop'],
        ],
        fstring_single: [
          [/\\[\\"'nrt]/, 'string.escape'],
          [/\{[^}]*\}/, 'string.interpolation'],
          [/[^'\\{]+/, 'string'],
          [/'/, 'string.interpolated', '@pop'],
        ],
        block: [
          [/\*\//, 'comment', '@pop'],
          [/[^*]+/, 'comment'],
          [/\*/, 'comment'],
        ],
      },
    });
    monaco.editor.defineTheme('spl-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
        { token: 'type', foreground: '4ec9b0' },
        { token: 'support.function.builtin', foreground: 'dcdcaa' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'string.interpolated', foreground: 'ce9178', fontStyle: 'bold' },
        { token: 'string.interpolation', foreground: '9cdcfe' },
        { token: 'string.escape', foreground: 'd7ba7d' },
        { token: 'operator.special', foreground: 'c586c0' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'number.float', foreground: 'b5cea8' },
        { token: 'number.hex', foreground: 'b5cea8' },
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
        { token: 'comment.doc', foreground: '6a9955', fontStyle: 'italic bold' },
        { token: 'operator', foreground: 'd4d4d4' },
        { token: 'delimiter', foreground: 'd4d4d4' },
        { token: 'identifier', foreground: '9cdcfe' },
        { token: 'variable.parameter', foreground: '9cdcfe', fontStyle: 'italic' },
        { token: 'keyword.operator', foreground: 'd4d4d4', fontStyle: 'bold' },
      ],
      colors: {},
    });
    monaco.editor.defineTheme('spl-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0000ff', fontStyle: 'bold' },
        { token: 'type', foreground: '267f99' },
        { token: 'support.function.builtin', foreground: '795e26' },
        { token: 'string', foreground: 'a31515' },
        { token: 'string.interpolated', foreground: 'a31515', fontStyle: 'bold' },
        { token: 'string.interpolation', foreground: '001080' },
        { token: 'string.escape', foreground: 'ff0000' },
        { token: 'operator.special', foreground: 'af00db' },
        { token: 'number', foreground: '098658' },
        { token: 'number.float', foreground: '098658' },
        { token: 'number.hex', foreground: '098658' },
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'comment.doc', foreground: '008000', fontStyle: 'italic bold' },
        { token: 'operator', foreground: '000000' },
        { token: 'delimiter', foreground: '000000' },
        { token: 'identifier', foreground: '001080' },
        { token: 'variable.parameter', foreground: '001080', fontStyle: 'italic' },
        { token: 'keyword.operator', foreground: '000000', fontStyle: 'bold' },
      ],
      colors: {},
    });
    monaco.editor.defineTheme('spl-midnight', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'c586c0', fontStyle: 'bold' },
        { token: 'type', foreground: '4ec9b0' },
        { token: 'support.function.builtin', foreground: 'd7ba7d' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'string.interpolated', foreground: 'ce9178', fontStyle: 'bold' },
        { token: 'string.interpolation', foreground: '79c0ff' },
        { token: 'string.escape', foreground: 'd7ba7d' },
        { token: 'operator.special', foreground: 'ff7b72' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'number.float', foreground: 'b5cea8' },
        { token: 'number.hex', foreground: 'b5cea8' },
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
        { token: 'comment.doc', foreground: '6a9955', fontStyle: 'italic bold' },
        { token: 'operator', foreground: 'd4d4d4' },
        { token: 'delimiter', foreground: 'ffd700' },
        { token: 'identifier', foreground: '9cdcfe' },
        { token: 'variable.parameter', foreground: '9cdcfe', fontStyle: 'italic' },
        { token: 'keyword.operator', foreground: 'ff7b72', fontStyle: 'bold' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#e6edf3',
      },
    });
    monaco.languages.setLanguageConfiguration('spl', {
      comments: { lineComment: '//', blockComment: ['/*', '*/'] },
      brackets: [['{', '}'], ['[', ']'], ['(', ')']],
      autoClosingPairs: [
        { open: '{', close: '}' }, { open: '[', close: ']' }, { open: '(', close: ')' },
        { open: '"', close: '"' }, { open: "'", close: "'" },
      ],
      indentationRules: {
        increaseIndentPattern: /^\s*.*\{\s*$/,
        decreaseIndentPattern: /^\s*\}\s*$/,
      },
      onEnterRules: [
        { beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/, action: { indent: 'indent', appendText: ' * ' } },
        { beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/, afterText: /^\s*\*\/$/, action: { indent: 'indent', appendText: ' * ' } },
        { beforeText: /^\s*\/\*.*$/, action: { indent: 'indent', appendText: ' * ' } },
        { beforeText: /^\s*\/\*.*$/, afterText: /^\s*\*\/$/, action: { indent: 'indent', appendText: ' * ' } },
      ],
    });
    const MODULES = ['math', 'string', 'json', 'random', 'sys', 'io', 'array', 'map', 'env', 'types', 'debug', 'log', 'time', 'memory', 'util', 'profiling', 'path', 'errors', 'iter', 'collections', 'fs', 'process', 'game', 'g2d', 'regex', 'csv', 'b64', 'logging', 'hash', 'uuid', 'os', 'copy', 'datetime', 'secrets', 'itools', 'cli', 'encoding', 'run'];
    const MODULE_MEMBERS = {
      math: ['sqrt', 'pow', 'sin', 'cos', 'tan', 'floor', 'ceil', 'round', 'round_to', 'abs', 'min', 'max', 'clamp', 'lerp', 'log', 'atan2', 'sign', 'deg_to_rad', 'rad_to_deg', 'PI', 'E', 'TAU'],
      string: ['upper', 'lower', 'replace', 'join', 'split', 'trim', 'starts_with', 'ends_with', 'repeat', 'pad_left', 'pad_right', 'split_lines', 'format', 'len', 'regex_match', 'regex_replace', 'chr', 'ord', 'hex', 'bin', 'hash_fnv', 'escape_regex'],
      json: ['json_parse', 'json_stringify'],
      random: ['random', 'random_int', 'random_choice', 'random_shuffle'],
      sys: ['cli_args', 'print', 'panic', 'error_message', 'Error', 'stack_trace', 'stack_trace_array', 'assertType', 'error_name', 'error_cause', 'ValueError', 'TypeError', 'RuntimeError', 'OSError', 'KeyError', 'is_error_type', 'repr', 'spl_version', 'platform', 'os_name', 'arch', 'exit_code', 'uuid', 'env_all', 'env_get', 'cwd', 'chdir', 'hostname', 'cpu_count', 'getpid', 'monotonic_time', 'env_set'],
      io: ['read_file', 'write_file', 'readFile', 'writeFile', 'readline', 'base64_encode', 'base64_decode', 'csv_parse', 'csv_stringify', 'fileExists', 'listDir', 'file_size', 'glob', 'listDirRecursive', 'create_dir', 'is_file', 'is_dir', 'copy_file', 'delete_file', 'move_file'],
      array: ['array', 'len', 'push', 'push_front', 'slice', 'map', 'filter', 'reduce', 'reverse', 'find', 'sort', 'flatten', 'flat_map', 'zip', 'chunk', 'unique', 'first', 'last', 'take', 'drop', 'sort_by', 'copy', 'cartesian', 'window', 'deep_equal', 'insert_at', 'remove_at'],
      env: ['env_get', 'env_all', 'env_set'],
      map: ['keys', 'values', 'has', 'merge', 'deep_equal', 'copy'],
      types: ['str', 'int', 'float', 'parse_int', 'parse_float', 'is_nan', 'is_inf', 'is_string', 'is_array', 'is_map', 'is_number', 'is_function', 'type'],
      debug: ['inspect', 'type', 'dir', 'stack_trace', 'assert_eq'],
      log: ['log_info', 'log_warn', 'log_error', 'log_debug'],
      time: ['time', 'sleep', 'time_format', 'monotonic_time'],
      memory: ['alloc', 'free', 'alloc_zeroed', 'ptr_address', 'ptr_from_address', 'ptr_offset', 'peek8', 'peek16', 'peek32', 'peek64', 'poke8', 'poke16', 'poke32', 'poke64', 'peek_float', 'poke_float', 'peek_double', 'poke_double', 'mem_copy', 'mem_set', 'mem_cmp', 'mem_move', 'realloc', 'align_up', 'align_down', 'bytes_read', 'bytes_write', 'ptr_is_null', 'string_to_bytes', 'bytes_to_string'],
      util: ['range', 'default', 'merge', 'all', 'any', 'vec2', 'vec3', 'rand_vec2', 'rand_vec3'],
      profiling: ['profile_cycles', 'profile_fn'],
      path: ['basename', 'dirname', 'path_join', 'cwd', 'chdir', 'realpath', 'temp_dir', 'read_file', 'write_file', 'fileExists', 'listDir', 'listDirRecursive', 'create_dir', 'is_file', 'is_dir', 'copy_file', 'delete_file', 'move_file', 'file_size', 'glob'],
      errors: ['Error', 'panic', 'error_message', 'error_name', 'error_cause', 'ValueError', 'TypeError', 'RuntimeError', 'OSError', 'KeyError', 'is_error_type'],
      iter: ['range', 'map', 'filter', 'reduce', 'all', 'any', 'cartesian', 'window'],
      collections: ['array', 'len', 'push', 'push_front', 'slice', 'keys', 'values', 'has', 'map', 'filter', 'reduce', 'reverse', 'find', 'sort', 'flatten', 'flat_map', 'zip', 'chunk', 'unique', 'first', 'last', 'take', 'drop', 'sort_by', 'copy', 'merge', 'deep_equal', 'cartesian', 'window'],
      fs: ['read_file', 'write_file', 'readFile', 'writeFile', 'fileExists', 'listDir', 'listDirRecursive', 'create_dir', 'is_file', 'is_dir', 'copy_file', 'delete_file', 'move_file'],
      process: ['list', 'find', 'open', 'close', 'read_u8', 'read_u16', 'read_u32', 'read_u64', 'read_i32', 'read_float', 'read_double', 'read_bytes', 'write_u8', 'write_u32', 'write_float', 'write_bytes', 'scan', 'scan_bytes', 'ptr_add', 'ptr_sub', 'ptr_diff'],
      regex: ['regex_match', 'regex_replace', 'escape_regex'],
      csv: ['csv_parse', 'csv_stringify'],
      b64: ['base64_encode', 'base64_decode'],
      logging: ['log_info', 'log_warn', 'log_error', 'log_debug'],
      hash: ['hash_fnv'],
      uuid: ['uuid'],
      os: ['cwd', 'chdir', 'getpid', 'hostname', 'cpu_count', 'env_get', 'env_all', 'env_set', 'listDir', 'create_dir', 'is_file', 'is_dir', 'temp_dir', 'realpath'],
      copy: ['copy', 'deep_equal'],
      datetime: ['time', 'sleep', 'time_format', 'monotonic_time'],
      secrets: ['random', 'random_int', 'random_choice', 'random_shuffle', 'uuid'],
      itools: ['range', 'map', 'filter', 'reduce', 'all', 'any', 'cartesian', 'window'],
      cli: ['cli_args'],
      encoding: ['base64_encode', 'base64_decode', 'string_to_bytes', 'bytes_to_string'],
      run: ['cli_args', 'exit_code'],
    };
    const BUILTIN_DOCS = {
      print: 'print(...values)\nOutputs values to console.',
      sqrt: 'sqrt(x)\nSquare root.',
      pow: 'pow(base, exp)\nPower.',
      len: 'len(x)\nLength of array or string.',
      array: 'array(...elements)\nCreate array.',
      type: 'type(x)\nReturn type name: number, string, array, dictionary, function, nil.',
      def: 'def name(params) { }\nDefine function.',
      for: 'for i in range(a, b) { } or for x in arr { }',
      alloc: 'alloc(n)\nAllocate n bytes; returns pointer. Cap 256 MiB.',
      free: 'free(ptr)\nFree pointer from alloc().',
      mem_copy: 'mem_copy(dest, src, n)\nCopy n bytes from src to dest.',
      mem_set: 'mem_set(ptr, byte, n)\nFill n bytes at ptr with byte (0–255).',
      mem_cmp: 'mem_cmp(a, b, n)\nCompare memory; returns -1, 0, or 1.',
      mem_move: 'mem_move(dest, src, n)\nLike mem_copy but handles overlapping regions.',
      realloc: 'realloc(ptr, new_size)\nResize allocation; returns new pointer or nil.',
      ptr_offset: 'ptr_offset(ptr, bytes)\nReturn ptr + bytes (same as ptr + n).',
      ptr_address: 'ptr_address(ptr)\nReturn integer address of pointer.',
      ptr_from_address: 'ptr_from_address(addr)\nCreate pointer from integer (e.g. MMIO).',
      ptr_align_up: 'ptr_align_up(ptr, align)\nRound pointer up to alignment.',
      ptr_align_down: 'ptr_align_down(ptr, align)\nRound pointer down to alignment.',
      peek8: 'peek8(ptr)\nRead 8-bit value at address.',
      peek16: 'peek16(ptr)\nRead 16-bit value at address.',
      peek32: 'peek32(ptr)\nRead 32-bit value at address.',
      peek64: 'peek64(ptr)\nRead 64-bit value at address.',
      poke8: 'poke8(ptr, value)\nWrite 8-bit value at address.',
      poke32: 'poke32(ptr, value)\nWrite 32-bit value at address.',
      peek_float: 'peek_float(ptr)\nRead 32-bit float at address.',
      poke_float: 'poke_float(ptr, value)\nWrite 32-bit float at address.',
      peek_double: 'peek_double(ptr)\nRead 64-bit double at address.',
      poke_double: 'poke_double(ptr, value)\nWrite 64-bit double at address.',
      align_up: 'align_up(value, align)\nRound value up to alignment (e.g. page size).',
      align_down: 'align_down(value, align)\nRound value down to alignment.',
      range: 'range(start, end) or range(start, end, step)\nIterable range.',
      map: 'map(arr, fn)\nMap array with function.',
      filter: 'filter(arr, fn)\nFilter array by predicate.',
      reduce: 'reduce(arr, fn, initial)\nReduce array to single value.',
      slice: 'slice(arr, start, end)\nArray slice; supports negative indices.',
      file_exists: 'file_exists(path)\nReturns true if file exists. (Alias: fileExists)',
      fileExists: 'fileExists(path)\nReturns true if file exists.',
      list_dir: 'list_dir(path)\nList directory entries. (Alias: listDir)',
      listDir: 'listDir(path)\nList directory entries.',
      env_get: 'env_get(name)\nGet environment variable.',
      parse_int: 'parse_int(str)\nParse string to integer; returns nil on failure.',
      parse_float: 'parse_float(str)\nParse string to float.',
      read_file: 'read_file(path)\nRead file as string.',
      write_file: 'write_file(path, content)\nWrite string to file.',
      json_parse: 'json_parse(str)\nParse JSON string to value.',
      json_stringify: 'json_stringify(value)\nSerialize value to JSON string.',
      cli_args: 'cli_args()\nReturn array of command-line arguments.',
      inspect: 'inspect(x)\nReturn string representation for debugging.',
      copy: 'copy(x)\nShallow copy of array or map.',
      deep_equal: 'deep_equal(a, b)\nDeep equality check.',
      ptr_add: 'ptr_add(ptr, bytes)\nReturn pointer advanced by bytes.',
      ptr_sub: 'ptr_sub(ptr, bytes)\nReturn pointer moved back by bytes.',
      is_aligned: 'is_aligned(ptr_or_value, align)\nTrue if pointer/value is aligned.',
      mem_set_zero: 'mem_set_zero(ptr, n)\nZero n bytes at ptr.',
      ptr_tag: 'ptr_tag(ptr, tag)\nTag pointer with integer tag.',
      ptr_untag: 'ptr_untag(ptr)\nRemove tag; returns raw pointer.',
      ptr_get_tag: 'ptr_get_tag(ptr)\nReturn tag of tagged pointer.',
      struct_define: 'struct_define(name, field_offsets)\nDefine struct layout (name -> byte offsets).',
      offsetof_struct: 'offsetof_struct(struct_name, field)\nByte offset of field in struct.',
      sizeof_struct: 'sizeof_struct(struct_name)\nTotal size of struct in bytes.',
      pool_create: 'pool_create(block_size, count)\nCreate memory pool for fixed-size blocks.',
      pool_alloc: 'pool_alloc(pool)\nAllocate block from pool; nil if full.',
      pool_free: 'pool_free(pool, ptr)\nReturn block to pool.',
      pool_destroy: 'pool_destroy(pool)\nDestroy pool and free all memory.',
      read_be16: 'read_be16(ptr)\nRead 16-bit big-endian at ptr.',
      read_be32: 'read_be32(ptr)\nRead 32-bit big-endian at ptr.',
      read_be64: 'read_be64(ptr)\nRead 64-bit big-endian at ptr.',
      write_be16: 'write_be16(ptr, value)\nWrite 16-bit big-endian.',
      write_be32: 'write_be32(ptr, value)\nWrite 32-bit big-endian.',
      write_be64: 'write_be64(ptr, value)\nWrite 64-bit big-endian.',
      read_le16: 'read_le16(ptr)\nRead 16-bit little-endian at ptr.',
      read_le32: 'read_le32(ptr)\nRead 32-bit little-endian at ptr.',
      read_le64: 'read_le64(ptr)\nRead 64-bit little-endian at ptr.',
      write_le16: 'write_le16(ptr, value)\nWrite 16-bit little-endian.',
      write_le32: 'write_le32(ptr, value)\nWrite 32-bit little-endian.',
      write_le64: 'write_le64(ptr, value)\nWrite 64-bit little-endian.',
      alloc_zeroed: 'alloc_zeroed(n)\nAllocate n bytes and zero them; returns pointer or nil.',
      dump_memory: 'dump_memory(ptr, n)\nPrint hex dump of n bytes at ptr (debug).',
      alloc_tracked: 'alloc_tracked(n)\nAllocate with tracking (debug).',
      free_tracked: 'free_tracked(ptr)\nFree tracked allocation.',
      get_tracked_allocations: 'get_tracked_allocations()\nList active tracked allocations.',
      atomic_load32: 'atomic_load32(ptr)\nAtomic load 32-bit.',
      atomic_store32: 'atomic_store32(ptr, value)\nAtomic store 32-bit.',
      atomic_add32: 'atomic_add32(ptr, delta)\nAtomic add; returns previous value.',
      atomic_cmpxchg32: 'atomic_cmpxchg32(ptr, expected, desired)\nCompare-and-swap 32-bit.',
      map_file: 'map_file(path)\nMemory-map file; returns ptr and length (platform-dependent).',
      unmap_file: 'unmap_file(ptr, len)\nUnmap previously mapped region.',
      memory_protect: 'memory_protect(ptr, len, prot)\nChange protection (r/w/x); platform-dependent.',
      error_name: 'error_name(err)\nReturn error type name string.',
      error_cause: 'error_cause(err)\nReturn cause string or nil.',
      is_error_type: 'is_error_type(err, type_name)\nTrue if err is of given type (e.g. "ValueError").',
      ValueError: 'ValueError(message)\nCreate ValueError.',
      TypeError: 'TypeError(message)\nCreate TypeError.',
      RuntimeError: 'RuntimeError(message)\nCreate RuntimeError.',
      OSError: 'OSError(message)\nCreate OSError.',
      KeyError: 'KeyError(message)\nCreate KeyError.',
      bytes_read: 'bytes_read()\nTotal bytes read (I/O counter).',
      bytes_write: 'bytes_write()\nTotal bytes written (I/O counter).',
      ptr_is_null: 'ptr_is_null(ptr)\nTrue if pointer is null.',
      size_of_ptr: 'size_of_ptr()\nSize of pointer in bytes (e.g. 8).',
      mem_swap: 'mem_swap(a, b, n)\nSwap n bytes between a and b.',
      basename: 'basename(path)\nReturn the last component of a path (file or directory name).',
      dirname: 'dirname(path)\nReturn the directory part of a path.',
      path_join: 'path_join(part1, part2, ...)\nJoin path segments into a single path.',
      ptr_eq: 'ptr_eq(a, b)\nTrue if both pointers are nil or the same address.',
      alloc_aligned: 'alloc_aligned(n, alignment)\nAllocate n bytes with alignment (power of 2). Use free() to release.',
      string_to_bytes: 'string_to_bytes(s)\nReturn array of integers 0–255 (UTF-8 bytes).',
      bytes_to_string: 'bytes_to_string(arr)\nConvert array of ints 0–255 to string (UTF-8).',
      memory_page_size: 'memory_page_size()\nReturns typical page size in bytes (e.g. 4096).',
      mem_find: 'mem_find(ptr, n, byte)\nFind first occurrence of byte (0–255) in n bytes; returns index or -1.',
      mem_fill_pattern: 'mem_fill_pattern(ptr, n, pattern32)\nFill n bytes with repeating 32-bit pattern (LE).',
      ptr_compare: 'ptr_compare(a, b)\nCompare pointers as addresses: -1 if a<b, 0 if equal, 1 if a>b. Null is less than any non-null.',
      mem_reverse: 'mem_reverse(ptr, n)\nReverse the order of n bytes in place.',
      mem_scan: 'mem_scan(ptr, n, pattern)\nFind first occurrence of byte array pattern in n bytes at ptr. Returns index or -1.',
      mem_overlaps: 'mem_overlaps(ptr_a, ptr_b, n_a, n_b)\nTrue if the two memory ranges overlap (use mem_move if true).',
      get_endianness: 'get_endianness()\nReturns "little" or "big" (platform byte order).',
      mem_is_zero: 'mem_is_zero(ptr, n)\nTrue if all n bytes at ptr are zero.',
      read_le_float: 'read_le_float(ptr)\nRead 32-bit float (little-endian) at ptr.',
      write_le_float: 'write_le_float(ptr, x)\nWrite 32-bit float (little-endian) at ptr.',
      read_le_double: 'read_le_double(ptr)\nRead 64-bit double (little-endian) at ptr.',
      write_le_double: 'write_le_double(ptr, x)\nWrite 64-bit double (little-endian) at ptr.',
      mem_count: 'mem_count(ptr, n, byte)\nCount occurrences of byte (0–255) in the first n bytes. Returns integer.',
      ptr_min: 'ptr_min(a, b)\nReturn the pointer with the smaller address (or the non-null one if the other is null).',
      ptr_max: 'ptr_max(a, b)\nReturn the pointer with the larger address (or the non-null one if the other is null).',
      ptr_diff: 'ptr_diff(a, b)\nReturn (a - b) in bytes (signed). Both must be non-null. Useful for size/offset between pointers.',
      read_be_float: 'read_be_float(ptr)\nRead 32-bit float big-endian at ptr.',
      write_be_float: 'write_be_float(ptr, x)\nWrite 32-bit float big-endian at ptr.',
      read_be_double: 'read_be_double(ptr)\nRead 64-bit double big-endian at ptr.',
      write_be_double: 'write_be_double(ptr, x)\nWrite 64-bit double big-endian at ptr.',
      ptr_in_range: 'ptr_in_range(ptr, base, size)\nTrue if ptr is in [base, base+size). Both ptr and base must be non-null.',
      mem_xor: 'mem_xor(dest, src, n)\nXOR n bytes: dest[i] ^= src[i]. Useful for in-place encode/decode or crypto.',
      mem_zero: 'mem_zero(ptr, n)\nZero n bytes at ptr. Same as mem_set(ptr, 0, n).',
      window_create: 'window_create(width, height, title)\nCreate game window (spl_game).',
      window_close: 'window_close()\nClose the game window.',
      set_target_fps: 'set_target_fps(fps)\nSet target frames per second.',
      key_down: 'key_down("KEY_NAME")\nTrue while key is held (e.g. "LEFT", "RIGHT", "UP", "DOWN", "SPACE").',
      clear: 'clear(r, g, b)\nClear screen with RGB color.',
      draw_rect: 'draw_rect(x, y, w, h, r, g, b)\nDraw filled rectangle.',
      draw_circle: 'draw_circle(x, y, radius, r, g, b)\nDraw filled circle.',
      draw_line: 'draw_line(x1, y1, x2, y2, r, g, b)\nDraw line.',
      draw_text: 'draw_text(text, x, y, fontSize)\nDraw text on screen.',
      game_loop: 'game_loop(update_fn, render_fn)\nRun game loop; call update_fn each frame for input, render_fn to draw.',
      readline: 'readline([prompt])\nRead one line from stdin. Optional prompt printed first. Returns string.',
      chr: 'chr(n)\nInteger code point to single-character string (ASCII/UTF-8).',
      ord: 'ord(s)\nFirst character of string to integer code point.',
      hex: 'hex(n)\nInteger to hexadecimal string (e.g. "ff").',
      bin: 'bin(n)\nInteger to binary string (e.g. "1010").',
      assert_eq: 'assert_eq(a, b [, message])\nAssert deep equality; throws with message on failure (for tests).',
      base64_encode: 'base64_encode(s)\nEncode string to Base64.',
      base64_decode: 'base64_decode(s)\nDecode Base64 string.',
      uuid: 'uuid()\nGenerate UUID v4-style string.',
      hash_fnv: 'hash_fnv(s)\nFNV-1a 64-bit hash of string.',
      csv_parse: 'csv_parse(s)\nParse CSV to array of rows (array of string arrays).',
      csv_stringify: 'csv_stringify(rows)\nSerialize rows to CSV string.',
      time_format: 'time_format(fmt [, t])\nstrftime-style format; t optional (default now).',
      stack_trace_array: 'stack_trace_array()\nCall stack as [{name, line, column}, ...].',
      is_nan: 'is_nan(x)\nTrue if x is NaN.',
      is_inf: 'is_inf(x)\nTrue if x is ±infinity.',
      env_all: 'env_all()\nAll environment variables as map.',
      escape_regex: 'escape_regex(s)\nEscape regex special chars.',
      cwd: 'cwd()\nCurrent working directory.',
      chdir: 'chdir(path)\nChange working directory. Returns true on success.',
      hostname: 'hostname()\nMachine hostname.',
      cpu_count: 'cpu_count()\nNumber of hardware threads.',
      temp_dir: 'temp_dir()\nSystem temp directory path.',
      realpath: 'realpath(path)\nCanonical absolute path; nil on error.',
      getpid: 'getpid()\nCurrent process ID.',
      monotonic_time: 'monotonic_time()\nSeconds for deltas (steady clock).',
      file_size: 'file_size(path)\nFile size in bytes; nil on error.',
      env_set: 'env_set(name, value)\nSet env var (nil to unset).',
      glob: 'glob(pattern [, base_dir])\nPaths matching * and ?.',
      is_string: 'is_string(x)\nTrue if x is string.',
      is_array: 'is_array(x)\nTrue if x is array.',
      is_map: 'is_map(x)\nTrue if x is map.',
      is_number: 'is_number(x)\nTrue if x is int or float.',
      is_function: 'is_function(x)\nTrue if x is function.',
      round_to: 'round_to(x, decimals)\nRound to N decimal places.',
      insert_at: 'insert_at(arr, index, value)\nInsert value at index; returns array.',
      remove_at: 'remove_at(arr, index)\nRemove element at index; returns removed value.',
    };
    const STRING_METHODS = ['length', 'upper', 'lower', 'replace', 'split'];
    const ARRAY_METHODS = ['length', 'push', 'slice', 'indexOf'];
    let symbolCache = { versionId: 0, symbols: null };
    function parseSourceForSymbols(text) {
      const vars = [], funcs = [];
      const lines = text.split(/\r\n|\r|\n/);
      const reLet = /\b(let|const|var)\s+([a-zA-Z_]\w*)/g;
      const reDef = /\bdef\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)/g;
      const reClass = /\bclass\s+([a-zA-Z_]\w*)/g;
      lines.forEach((line, i) => {
        let m;
        reLet.lastIndex = 0; while ((m = reLet.exec(line)) !== null) vars.push({ name: m[2], line: i + 1, column: m.index + m[0].indexOf(m[2]) + 1 });
        reDef.lastIndex = 0; while ((m = reDef.exec(line)) !== null) {
          const params = m[2].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          funcs.push({ name: m[1], line: i + 1, column: m.index + 4, params: params });
        }
        reClass.lastIndex = 0; while ((m = reClass.exec(line)) !== null) funcs.push({ name: m[1], line: i + 1, column: m.index + 6, params: [] });
      });
      return { variables: vars, functions: funcs };
    }
    function getCachedSymbols(model) {
      if (!model) return null;
      const vid = model.getVersionId();
      if (symbolCache.versionId === vid && symbolCache.symbols) return symbolCache.symbols;
      const symbols = parseSourceForSymbols(model.getValue());
      symbolCache = { versionId: vid, symbols };
      return symbols;
    }
    function getBuiltinParams(name) {
      const doc = BUILTIN_DOCS[name];
      if (!doc) return [];
      const first = doc.split('\n')[0];
      const match = first.match(/^[a-zA-Z_]\w*\s*\(([^)]*)\)/);
      if (!match) return [];
      return match[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }
    monaco.languages.registerCompletionItemProvider('spl', {
      triggerCharacters: ['.', '(', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
      provideCompletionItems: function (model, position) {
        const word = model.getWordUntilPosition(position);
        const range = { startLineNumber: position.lineNumber, startColumn: word.startColumn, endLineNumber: position.lineNumber, endColumn: word.endColumn };
        const lineContent = model.getLineContent(position.lineNumber);
        const beforeCursor = lineContent.slice(0, position.column - 1);
        const suggestions = [];
        BUILTINS.forEach(name => {
          suggestions.push({
            label: name,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: name + '($0)',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: BUILTIN_DOCS[name] ? BUILTIN_DOCS[name].split('\n')[0] : 'Built-in',
            documentation: { value: BUILTIN_DOCS[name] || ('Built-in: ' + name) },
            range,
          });
        });
        const symbols = getCachedSymbols(model);
        if (symbols) {
        symbols.variables.forEach(({ name }) => {
          suggestions.push({ label: name, kind: monaco.languages.CompletionItemKind.Variable, detail: 'Variable', range });
        });
        symbols.functions.forEach(({ name }) => {
          suggestions.push({ label: name, kind: monaco.languages.CompletionItemKind.Function, insertText: name + '($0)', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Function', range });
        });
        }
        if (beforeCursor.endsWith('.')) {
          const objWord = (beforeCursor.match(/([a-zA-Z_]\w*)\.\s*$/) || [])[1];
          if (objWord) {
            const members = MODULE_MEMBERS[objWord];
            if (members && members.length) {
              members.forEach((mem) => {
                const isConst = /^[A-Z_]+$/.test(mem) || mem === 'PI' || mem === 'E' || mem === 'TAU';
                suggestions.push({
                  label: mem,
                  kind: isConst ? monaco.languages.CompletionItemKind.Constant : monaco.languages.CompletionItemKind.Method,
                  insertText: isConst ? mem : mem + '($0)',
                  insertTextRules: isConst ? undefined : monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  detail: objWord + ' module',
                  range: { startLineNumber: position.lineNumber, startColumn: word.startColumn, endLineNumber: position.lineNumber, endColumn: word.endColumn },
                });
              });
            }
            STRING_METHODS.forEach(m => suggestions.push({ label: m, kind: monaco.languages.CompletionItemKind.Method, insertText: m + '($0)', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'String method', range: { startLineNumber: position.lineNumber, startColumn: word.startColumn, endLineNumber: position.lineNumber, endColumn: word.endColumn } }));
            ARRAY_METHODS.forEach(m => suggestions.push({ label: m, kind: monaco.languages.CompletionItemKind.Method, insertText: m + '($0)', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Array method', range: { startLineNumber: position.lineNumber, startColumn: word.startColumn, endLineNumber: position.lineNumber, endColumn: word.endColumn } }));
          }
        }
        if (/^\s*import\s+$/.test(beforeCursor)) {
          MODULES.forEach(m => suggestions.push({ label: m, kind: monaco.languages.CompletionItemKind.Module, insertText: m, detail: 'Built-in module', documentation: { value: '`import ' + m + '` then use ' + m + '.function_name()' }, range }));
        }
        const importQuoteMatch = beforeCursor.match(/import\s*\(\s*(["'])([^"']*)$/);
        if (importQuoteMatch) {
          const quote = importQuoteMatch[1];
          const prefix = (importQuoteMatch[2] || '').toLowerCase();
          const startCol = position.column - (importQuoteMatch[2] || '').length;
          const modRange = { startLineNumber: position.lineNumber, startColumn: startCol, endLineNumber: position.lineNumber, endColumn: position.column };
          MODULES.filter(m => m.toLowerCase().startsWith(prefix)).forEach(m =>
            suggestions.push({ label: m, kind: monaco.languages.CompletionItemKind.Module, insertText: m + quote + ')', detail: 'Stdlib module', range: modRange }));
        }
        const snippets = [
          { label: 'def', insertText: 'def ${1:name}($2) {\n\t$0\n}', detail: 'Function', kind: monaco.languages.CompletionItemKind.Snippet, documentation: { value: 'Define a function' } },
          { label: 'class', insertText: 'class ${1:Name} {\n\tdef ${2:method}(self) {\n\t\t$0\n\t}\n}', detail: 'Class', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'for range', insertText: 'for ${1:i} in range(${2:0}, ${3:10}) {\n\t$0\n}', detail: 'Loop', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'for in', insertText: 'for ${1:x} in ${2:array} {\n\t$0\n}', detail: 'For-in', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'for ..', insertText: 'for ${1:i} in ${2:1}..${3:10} {\n\t$0\n}', detail: 'Range 1..10', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'while', insertText: 'while (${1:condition}) {\n\t$0\n}', detail: 'While', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'if', insertText: 'if (${1:condition}) {\n\t$0\n}', detail: 'If', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'if/else', insertText: 'if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}', detail: 'If/else', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'try/catch', insertText: 'try {\n\t$0\n} catch (${1:e}) {\n\t$2\n}', detail: 'Try/catch', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'let', insertText: 'let ${1:name} = ${0:value}', detail: 'Variable', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'const', insertText: 'const ${1:name} = ${0:value}', detail: 'Constant', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'print', insertText: 'print($0)', detail: 'Print', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'match', insertText: 'match (${1:value}) {\n\tcase ${2:_}: $0\n}', detail: 'Match', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'defer', insertText: 'defer ${1:fn}($2)', detail: 'Defer call', kind: monaco.languages.CompletionItemKind.Snippet, documentation: { value: 'Run fn when scope exits' } },
          { label: 'assert', insertText: 'assert (${1:condition})${2:, "${3:message}"}', detail: 'Assert', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'lambda', insertText: 'lambda (${1:x}) => ${0:expr}', detail: 'Lambda', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'f-string', insertText: 'f"${1:Hello} ${2:{name}} ${3:}"', detail: 'F-string', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'repeat', insertText: 'repeat (${1:n}) {\n\t$0\n}', detail: 'Repeat n times', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'match guards', insertText: 'match (${1:value}) {\n\tcase ${2:x} if (${3:condition}): $0\n}', detail: 'Match with guard', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'alloc', insertText: 'let ${1:buf} = alloc(${2:64})', detail: 'Allocate memory', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'alloc_zeroed', insertText: 'let ${1:buf} = alloc_zeroed(${2:64})', detail: 'Allocate and zero memory', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'pool create/alloc/free', insertText: 'let ${1:pool} = pool_create(${2:16}, ${3:100})\nlet ${4:ptr} = pool_alloc(${1:pool})\n$0\npool_free(${1:pool}, ${4:ptr})', detail: 'Memory pool', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'struct_define', insertText: 'struct_define("${1:Point}", {"x": 0, "y": 8})\nlet ${2:size} = sizeof_struct("${1:Point}")', detail: 'Define struct layout', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'path_join', insertText: 'path_join(${1:"dir"}, ${2:"file.txt"})', detail: 'Join path segments', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'import math', insertText: 'let math = import("math")\n$0', detail: 'Stdlib: math (sqrt, pow, PI, E)', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'import string', insertText: 'let string = import("string")\n$0', detail: 'Stdlib: string (upper, split, regex)', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'import json', insertText: 'let json = import("json")\n$0', detail: 'Stdlib: json_parse, json_stringify', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'import io', insertText: 'let io = import("io")\n$0', detail: 'Stdlib: read_file, write_file, listDir', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'import path', insertText: 'let path = import("path")\nlet p = path.path_join(path.dirname(${1:file}), "other.txt")\n$0', detail: 'Stdlib: path_join, dirname, basename', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'import time', insertText: 'let time = import("time")\n$0', detail: 'Stdlib: time, sleep, time_format', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'import random', insertText: 'let random = import("random")\n$0', detail: 'Stdlib: random, random_int, random_choice', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'import sys', insertText: 'let sys = import("sys")\n$0', detail: 'Stdlib: cli_args, print, spl_version', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'import errors', insertText: 'let errors = import("errors")\n$0', detail: 'Stdlib: Error, panic, ValueError', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'import process', insertText: 'let process = import("process")\n$0', detail: 'Stdlib: process.list, open (Windows)', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'import collections', insertText: 'let collections = import("collections")\n$0', detail: 'Stdlib: array, map, filter, reduce', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'alloc_aligned', insertText: 'let ${1:buf} = alloc_aligned(${2:64}, ${3:16})\n$0\nfree(${1:buf})', detail: 'Aligned allocation', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'string_to_bytes / bytes_to_string', insertText: 'let bytes = string_to_bytes(${1:str})\nlet back = bytes_to_string(bytes)', detail: 'String ↔ bytes', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'mem_find', insertText: 'let idx = mem_find(${1:ptr}, ${2:n}, ${3:0x00})', detail: 'Find byte in memory', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'mem_fill_pattern', insertText: 'mem_fill_pattern(${1:ptr}, ${2:n}, ${3:0})', detail: 'Fill with 32-bit pattern', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'throw ValueError', insertText: 'throw ValueError("${1:message}")', detail: 'Throw ValueError', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'import memory', insertText: 'let memory = import("memory")\nlet buf = memory.alloc_zeroed(${1:64})\n$0\nmemory.free(buf)', detail: 'Stdlib: alloc, free, peek, poke', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'ptr_compare', insertText: 'let cmp = ptr_compare(${1:ptr_a}, ${2:ptr_b})', detail: 'Compare two pointers', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'mem_scan', insertText: 'let idx = mem_scan(${1:ptr}, ${2:n}, [${3:0x48, 0x65}])', detail: 'Find byte sequence', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'mem_overlaps check', insertText: 'if (mem_overlaps(${1:dest}, ${2:src}, ${3:n}, ${4:n})) {\n\tmem_move(${1:dest}, ${2:src}, ${3:n})\n} else {\n\tmem_copy(${1:dest}, ${2:src}, ${3:n})\n}', detail: 'Copy or move if overlapping', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'benchmark', insertText: 'let t0 = time()\n$1\nprint("elapsed:", time() - t0, "s")', detail: 'Time a block', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'read_le_float / write_le_float', insertText: 'write_le_float(${1:ptr}, ${2:3.14})\nlet x = read_le_float(${1:ptr})', detail: 'LE float at pointer', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'mem_is_zero', insertText: 'if (mem_is_zero(${1:ptr}, ${2:n})) {\n\t$0\n}', detail: 'Check if region is zero', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'read_le_double / write_le_double', insertText: 'write_le_double(${1:ptr}, ${2:3.14})\nlet x = read_le_double(${1:ptr})', detail: 'LE double at pointer', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'mem_count', insertText: 'let count = mem_count(${1:ptr}, ${2:n}, ${3:0})', detail: 'Count byte in memory', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'ptr_min / ptr_max', insertText: 'let lo = ptr_min(${1:ptr_a}, ${2:ptr_b})\nlet hi = ptr_max(${1:ptr_a}, ${2:ptr_b})', detail: 'Min/max pointer by address', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'ptr_diff', insertText: 'let bytes_between = ptr_diff(${1:end_ptr}, ${2:start_ptr})', detail: 'Byte difference between pointers', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'read_be_float / write_be_float', insertText: 'write_be_float(${1:ptr}, ${2:3.14})\nlet x = read_be_float(${1:ptr})', detail: 'BE float at pointer', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'ptr_in_range', insertText: 'if (ptr_in_range(${1:ptr}, ${2:base}, ${3:size})) {\n\t$0\n}', detail: 'Bounds check pointer in range', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'mem_xor', insertText: 'mem_xor(${1:dest}, ${2:src}, ${3:n})', detail: 'XOR bytes dest ^= src', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'mem_zero', insertText: 'mem_zero(${1:ptr}, ${2:n})', detail: 'Zero n bytes', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'try/catch/else/finally', insertText: 'try {\n\t$0\n} catch (${1:e}) {\n\t$2\n} else {\n\t$3\n} finally {\n\t$4\n}', detail: 'Try with else and finally', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'Surround with if', insertText: 'if (${1:condition}) {\n\t${TM_SELECTED_TEXT}\n}', detail: 'Wrap selection', kind: monaco.languages.CompletionItemKind.Snippet, documentation: { value: 'Wrap selection in if block' } },
          { label: 'Surround with try/catch', insertText: 'try {\n\t${TM_SELECTED_TEXT}\n} catch (${1:e}) {\n\t$0\n}', detail: 'Wrap selection', kind: monaco.languages.CompletionItemKind.Snippet, documentation: { value: 'Wrap selection in try-catch' } },
          { label: 'Surround with for', insertText: 'for ${1:i} in range(${2:0}, ${3:10}) {\n\t${TM_SELECTED_TEXT}\n}', detail: 'Wrap selection', kind: monaco.languages.CompletionItemKind.Snippet, documentation: { value: 'Wrap selection in for loop' } },
          { label: 'Surround with while', insertText: 'while (${1:condition}) {\n\t${TM_SELECTED_TEXT}\n}', detail: 'Wrap selection', kind: monaco.languages.CompletionItemKind.Snippet, documentation: { value: 'Wrap selection in while loop' } },
          { label: 'main', insertText: 'def main() {\n\t$0\n}\n\nmain()', detail: 'Entry point', kind: monaco.languages.CompletionItemKind.Snippet, documentation: { value: 'def main() and call' } },
          { label: 'class', insertText: 'class ${1:Name} {\n\tdef ${2:method}(self${3:, args}) {\n\t\t$0\n\t}\n}', detail: 'Class with method', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'for range step', insertText: 'for (${1:i} in range(${2:0}, ${3:10}, ${4:2})) {\n\t$0\n}', detail: 'For loop with step', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'read lines', insertText: 'let content = read_file("${1:path.txt}")\nlet lines = split(content, "\\n")\nfor (${2:line} in lines) {\n\t$0\n}', detail: 'Read file line by line', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'write file', insertText: 'write_file("${1:path.txt}", ${2:content})', detail: 'Write to file', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'test', insertText: 'def test_${1:name}() {\n\tlet expected = ${2:value}\n\tlet result = ${3:actual}\n\tassert (deep_equal(result, expected)), "expected " + inspect(expected) + " got " + inspect(result)\n}', detail: 'Test function', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'elapsed', insertText: 'let t0 = time()\n$1\nprint("elapsed:", time() - t0)', detail: 'Measure time', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'guard', insertText: 'if (!${1:condition}) return${2:}\n$0', detail: 'Guard clause', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'with file', insertText: 'let content = read_file("${1:path}")\n$0', detail: 'Read and use file', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'OVERLAY:rect', insertText: 'print("OVERLAY:rect " + str(${1:x}) + " " + str(${2:y}) + " " + str(${3:w}) + " " + str(${4:h}) + " #ff0000")', detail: 'Draw box on overlay', kind: monaco.languages.CompletionItemKind.Snippet, documentation: { value: 'Enable Overlay in toolbar, then Run. Draws a rectangle on screen.' } },
          { label: 'OVERLAY:circle', insertText: 'print("OVERLAY:circle " + str(${1:x}) + " " + str(${2:y}) + " " + str(${3:r}) + " #ff0000")', detail: 'Draw circle on overlay', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'OVERLAY:text', insertText: 'print("OVERLAY:text " + str(${1:x}) + " " + str(${2:y}) + " \\"${3:label}\\" #ffffff")', detail: 'Draw text on overlay', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'OVERLAY:clear', insertText: 'print("OVERLAY:clear")', detail: 'Clear overlay', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'read game state', insertText: 'let raw = read_file("${1:game_state.json}")\nlet state = json_parse(raw)\nlet player = state["player"]\nlet x = player["x"]\nlet y = player["y"]\nlet health = player["health"]\n$0', detail: 'Read player coords/health from JSON', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'draw box at player', insertText: 'print("OVERLAY:rect " + str(player["x"]) + " " + str(player["y"]) + " " + str(player["w"]) + " " + str(player["h"]) + " #00ff00")\nprint("OVERLAY:text " + str(player["x"]) + " " + str(player["y"] - 12) + " \\"HP " + str(player["health"]) + "\\" #ffffff")', detail: 'Draw player box + health on overlay', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'elif', insertText: 'elif (${1:condition}) {\n\t$0\n}', detail: 'Else if', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'match multi', insertText: 'match (${1:value}) {\n\tcase ${2:a}: $3\n\tcase ${4:b}: $5\n\tcase _: $0\n}', detail: 'Match with multiple cases', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'list comprehension', insertText: '[ for ${1:x} in ${2:arr} : ${3:expr} ]', detail: 'List comprehension', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'list comprehension filter', insertText: '[ for ${1:x} in ${2:arr} if (${3:cond}) : ${4:expr} ]', detail: 'List comp with filter', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'pipeline', insertText: '${1:value} |> ${2:fn}', detail: 'Pipeline', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'doc comment', insertText: '/// ${1:Description}', detail: 'Doc comment', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'type check', insertText: 'if (is_${1:string}(${2:value})) {\n\t$0\n}', detail: 'Type check (is_string, is_array, etc.)', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'null check', insertText: 'if (${1:value} == null) return${2:}\n$0', detail: 'Null guard', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'default value', insertText: 'let ${1:x} = default(${2:value}, ${3:fallback})', detail: 'Default if null', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'for with index', insertText: 'for ${1:i} in range(0, len(${2:arr})) {\n\tlet ${3:x} = ${2:arr}[${1:i}]\n\t$0\n}', detail: 'For loop with index', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'break', insertText: 'break', detail: 'Break loop', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'continue', insertText: 'continue', detail: 'Continue loop', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'return early', insertText: 'if (!${1:condition}) return ${2:}\n$0', detail: 'Early return', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'has key', insertText: 'if (has(${1:map}, "${2:key}")) {\n\t$0\n}', detail: 'Check map key', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'slice', insertText: 'slice(${1:arr}, ${2:start}, ${3:end})', detail: 'Array slice', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'push', insertText: 'push(${1:arr}, ${2:value})', detail: 'Push to array', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'map call', insertText: 'map(${1:arr}, ${2:fn})', detail: 'Map array', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'filter call', insertText: 'filter(${1:arr}, ${2:fn})', detail: 'Filter array', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'reduce call', insertText: 'reduce(${1:arr}, ${2:fn}, ${3:init})', detail: 'Reduce array', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'sort array', insertText: 'sort(${1:arr})', detail: 'Sort array', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'deep_equal', insertText: 'deep_equal(${1:a}, ${2:b})', detail: 'Deep equality', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'copy value', insertText: 'copy(${1:value})', detail: 'Shallow copy', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'freeze', insertText: 'freeze(${1:arr})', detail: 'Freeze array/map', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'env_get', insertText: 'env_get("${1:VAR}")', detail: 'Get env var', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'file_exists', insertText: 'file_exists("${1:path}")', detail: 'Check file exists', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'list_dir', insertText: 'list_dir("${1:path}")', detail: 'List directory', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'Surround with match', insertText: 'match (${1:value}) {\n\tcase _: ${TM_SELECTED_TEXT}\n}', detail: 'Wrap in match', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'Surround with lambda', insertText: 'lambda (${1:x}) => ${TM_SELECTED_TEXT}', detail: 'Wrap in lambda', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'browser: fetch_resource', insertText: 'def fetch_resource(url) {\n\tif (slice(url, 0, 7) == "file://") return read_file(slice(url, 7, len(url)))\n\treturn ""\n}', detail: 'Browser: fetch URL or file', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'browser: make_node', insertText: 'make_node("${1:tag}", ${2:{}}, array($0))', detail: 'Browser: DOM node', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'browser: make_box', insertText: 'make_box(${1:0}, ${2:0}, ${3:w}, ${4:h}, array())', detail: 'Browser: layout box', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'browser: walk_dom', insertText: 'def walk_dom(node, depth) {\n\tif (node == null) return\n\t$0\n\tlet kids = default(node["children"], array())\n\tfor i in range(0, len(kids)) { walk_dom(kids[i], depth + 1) }\n}', detail: 'Browser: walk DOM tree', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'browser: viewport', insertText: 'let viewport = { "w": ${1:800}, "h": ${2:600} }', detail: 'Browser: viewport size', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'browser: history_push', insertText: 'push(history, current_url)\ncurrent_url = ${1:url}', detail: 'Browser: push history', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'browser: paint_box', insertText: 'def paint(box) {\n\tif (box == null) return\n\t// draw_rect(box["x"], box["y"], box["w"], box["h"])\n\tlet kids = default(box["children"], array())\n\tfor i in range(0, len(kids)) { paint(kids[i]) }\n}', detail: 'Browser: paint layout tree', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'browser: parse_url', insertText: 'parse_url(${1:url})', detail: 'Browser: parse URL', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'algo: binary search', insertText: 'def binary_search(arr, key) {\n\tlet lo = 0\n\tlet hi = len(arr) - 1\n\twhile (lo <= hi) {\n\t\tlet m = int((lo + hi) / 2)\n\t\tif (arr[m] == key) return m\n\t\tif (arr[m] < key) lo = m + 1\n\t\telse hi = m - 1\n\t}\n\treturn -1\n}', detail: 'Binary search', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'algo: gcd', insertText: 'def gcd(a, b) {\n\twhile (b != 0) { let t = b; b = a % b; a = t }\n\treturn a\n}', detail: 'GCD', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'algo: BFS', insertText: 'def bfs(start, neighbors, visit) {\n\tlet q = array(start)\n\tlet seen = {}\n\twhile (len(q) > 0) {\n\t\tlet node = q[0]; remove_at(q, 0)\n\t\tif (has(seen, str(node))) continue\n\t\tseen[str(node)] = true\n\t\tvisit(node)\n\t\tfor n in neighbors(node) push(q, n)\n\t}\n}', detail: 'BFS', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'algo: DFS', insertText: 'def dfs(node, neighbors, visit) {\n\tvisit(node)\n\tfor n in neighbors(node) { dfs(n, neighbors, visit) }\n}', detail: 'DFS', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'ds: linked node', insertText: '{ "value": ${1:x}, "next": ${2:null} }', detail: 'Linked list node', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'ds: tree node', insertText: '{ "value": ${1:x}, "left": ${2:null}, "right": ${3:null} }', detail: 'Binary tree node', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'parser: peek/advance', insertText: 'def peek() { if (pos >= len(tokens)) return null; return tokens[pos] }\ndef advance() { if (pos < len(tokens)) pos = pos + 1 }', detail: 'Parser peek/advance', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'parser: expect', insertText: 'def expect(kind) {\n\tif (peek() != kind) throw "expected " + str(kind)\n\tlet t = peek(); advance(); return t\n}', detail: 'Parser expect token', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'vm: opcode', insertText: 'let OP_${1:NAME} = ${2:0}', detail: 'VM opcode constant', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'vm: dispatch', insertText: 'if (op == OP_${1:X}) { $0 } else if (op == OP_${2:Y}) { }', detail: 'VM opcode dispatch', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'Result type', insertText: 'def ok(value) { return { "ok": true, "value": value } }\ndef err(msg) { return { "ok": false, "error": msg } }\ndef is_ok(r) { return has(r, "ok") and r["ok"] }', detail: 'Result/error type', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'Option type', insertText: 'def some(x) { return { "some": true, "value": x } }\ndef none() { return { "some": false } }\ndef is_some(o) { return has(o, "some") and o["some"] }', detail: 'Option type', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'merge sort', insertText: 'def merge_sort(arr) {\n\tif (len(arr) <= 1) return arr\n\tlet mid = int(len(arr) / 2)\n\tlet left = merge_sort(slice(arr, 0, mid))\n\tlet right = merge_sort(slice(arr, mid, len(arr)))\n\treturn merge(left, right)\n}', detail: 'Merge sort', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'hash map get/default', insertText: 'def map_get_default(m, key, default_val) {\n\tif (has(m, key)) return m[key]\n\treturn default_val\n}', detail: 'Map get with default', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'iterator pattern', insertText: 'def make_iterator(arr) { return { "arr": arr, "i": 0 } }\ndef next(it) {\n\tif (it["i"] >= len(it["arr"])) return null\n\tlet v = it["arr"][it["i"]]; it["i"] = it["i"] + 1; return v\n}', detail: 'Iterator', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'curry', insertText: 'def curry(f, a) { return lambda (b) => f(a, b) }', detail: 'Curry', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'compose', insertText: 'def compose(f, g) { return lambda (x) => f(g(x)) }', detail: 'Compose functions', kind: monaco.languages.CompletionItemKind.Snippet },
          { label: 'memoize', insertText: 'def memoize(f) {\n\tlet cache = {}\n\treturn lambda (x) => { let k = str(x); if (has(cache, k)) return cache[k]; let v = f(x); cache[k] = v; return v }\n}', detail: 'Memoize', kind: monaco.languages.CompletionItemKind.Snippet },
        ];
        snippets.forEach(s => { s.range = range; s.insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet; });
        let all = [...suggestions, ...snippets];
        const prefix = (word && word.word) ? word.word.toLowerCase() : '';
        if (prefix) {
          const lower = (l) => (l.label || '').toLowerCase();
          all = all.filter((s) => lower(s).startsWith(prefix));
          all.sort((a, b) => {
            const la = lower(a);
            const lb = lower(b);
            const aExact = la === prefix ? 1 : 0;
            const bExact = lb === prefix ? 1 : 0;
            if (bExact - aExact !== 0) return bExact - aExact;
            return la.localeCompare(lb);
          });
        }
        return { suggestions: all };
      },
    });
    monaco.languages.registerHoverProvider('spl', {
      provideHover: function (model, position) {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        const name = word.word;
        if (BUILTIN_DOCS[name]) return { contents: [{ value: '```spl\n' + BUILTIN_DOCS[name] + '\n```' }] };
        if (BUILTINS.includes(name)) return { contents: [{ value: '**' + name + '**\nBuilt-in function.' }] };
        const symbols = getCachedSymbols(model);
        const v = symbols.variables.find(x => x.name === name);
        if (v) return { contents: [{ value: 'Variable **' + name + '**\nDefined at line ' + v.line }] };
        const f = symbols.functions.find(x => x.name === name);
        if (f) {
          const sig = f.params && f.params.length ? name + '(' + f.params.join(', ') + ')' : name + '(…)';
          return { contents: [{ value: 'Function **' + sig + '**\nDefined at line ' + f.line }] };
        }
        return null;
      },
    });
    monaco.languages.registerDefinitionProvider('spl', {
      provideDefinition: function (model, position) {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        const name = word.word;
        const symbols = getCachedSymbols(model);
        const v = symbols.variables.find(x => x.name === name);
        if (v) return { uri: model.uri, range: { startLineNumber: v.line, startColumn: v.column, endLineNumber: v.line, endColumn: v.column + name.length } };
        const f = symbols.functions.find(x => x.name === name);
        if (f) return { uri: model.uri, range: { startLineNumber: f.line, startColumn: f.column, endLineNumber: f.line, endColumn: f.column + name.length } };
        return null;
      },
    });
    monaco.languages.registerReferenceProvider('spl', {
      provideReferences: function (model, position) {
        const word = model.getWordAtPosition(position);
        if (!word) return [];
        const name = word.word;
        const refs = [];
        const re = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
        const text = model.getValue();
        const lines = text.split(/\r\n|\r|\n/);
        lines.forEach((line, i) => {
          let m;
          re.lastIndex = 0;
          while ((m = re.exec(line)) !== null)
            refs.push({ uri: model.uri, range: { startLineNumber: i + 1, startColumn: m.index + 1, endLineNumber: i + 1, endColumn: m.index + name.length + 1 } });
        });
        return refs;
      },
    });
    monaco.languages.registerRenameProvider('spl', {
      provideRenameEdits: function (model, position, newName) {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        const name = word.word;
        const textEdits = [];
        const re = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
        const text = model.getValue();
        const lines = text.split(/\r\n|\r|\n/);
        lines.forEach((line, i) => {
          let m;
          re.lastIndex = 0;
          while ((m = re.exec(line)) !== null)
            textEdits.push({ range: { startLineNumber: i + 1, startColumn: m.index + 1, endLineNumber: i + 1, endColumn: m.index + name.length + 1 }, text: newName });
        });
        return { edits: textEdits.map(e => ({ resource: model.uri, textEdit: e })) };
      },
    });

    monaco.languages.registerSignatureHelpProvider('spl', {
      signatureHelpTriggerCharacters: ['(', ','],
      signatureHelpRetriggerCharacters: [','],
      provideSignatureHelp: function (model, position, token, context) {
        const lineContent = model.getLineContent(position.lineNumber);
        const beforeCursor = lineContent.slice(0, position.column - 1);
        const openParen = beforeCursor.lastIndexOf('(');
        if (openParen === -1) return null;
        const beforeParen = lineContent.slice(0, openParen);
        const nameMatch = beforeParen.match(/([a-zA-Z_]\w*)\s*$/);
        if (!nameMatch) return null;
        const name = nameMatch[1];
        let params = [];
        let label = name + '()';
        let documentation = '';
        if (BUILTINS.includes(name)) {
          params = getBuiltinParams(name);
          const doc = BUILTIN_DOCS[name];
          label = (doc && doc.split('\n')[0]) || (name + '(…)');
          documentation = doc || '';
        } else {
          const symbols = getCachedSymbols(model);
          const fn = symbols.functions.find(function (f) { return f.name === name; });
          if (fn && fn.params && fn.params.length) {
            params = fn.params;
            label = name + '(' + params.join(', ') + ')';
          } else if (fn) {
            label = name + '(…)';
          } else {
            return null;
          }
        }
        const argsSoFar = lineContent.slice(openParen + 1, position.column - 1);
        let activeParameter = 0;
        for (let i = 0; i < argsSoFar.length; i++) if (argsSoFar[i] === ',') activeParameter++;
        const signatures = [{
          label: label,
          documentation: documentation,
          parameters: params.map(function (p) { return { label: p, documentation: '' }; }),
        }];
        return {
          value: { signatures: signatures, activeSignature: 0, activeParameter: params.length ? Math.min(activeParameter, params.length - 1) : 0 },
          dispose: function () {},
        };
      },
    });

    monaco.languages.registerDocumentSymbolProvider('spl', {
      provideDocumentSymbols: function (model) {
        const symbols = getCachedSymbols(model);
        const result = [];
        symbols.functions.forEach((f) => {
          result.push({
            name: f.name + '()',
            detail: 'function',
            kind: monaco.languages.SymbolKind.Function,
            range: { startLineNumber: f.line, startColumn: f.column, endLineNumber: f.line, endColumn: f.column + f.name.length },
            selectionRange: { startLineNumber: f.line, startColumn: f.column, endLineNumber: f.line, endColumn: f.column + f.name.length },
          });
        });
        symbols.variables.forEach((v) => {
          result.push({
            name: v.name,
            detail: 'variable',
            kind: monaco.languages.SymbolKind.Variable,
            range: { startLineNumber: v.line, startColumn: v.column, endLineNumber: v.line, endColumn: v.column + v.name.length },
            selectionRange: { startLineNumber: v.line, startColumn: v.column, endLineNumber: v.line, endColumn: v.column + v.name.length },
          });
        });
        return result;
      },
    });

    monaco.languages.registerDocumentHighlightProvider('spl', {
      provideDocumentHighlights: function (model, position, token) {
        const word = model.getWordAtPosition(position);
        if (!word) return [];
        const name = word.word;
        if (/^\d+$/.test(name)) return [];
        const refs = [];
        const re = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
        const text = model.getValue();
        const lines = text.split(/\r\n|\r|\n/);
        lines.forEach(function (line, i) {
          re.lastIndex = 0;
          var m;
          while ((m = re.exec(line)) !== null)
            refs.push({ range: { startLineNumber: i + 1, startColumn: m.index + 1, endLineNumber: i + 1, endColumn: m.index + name.length + 1 }, kind: monaco.languages.DocumentHighlightKind.Text });
        });
        return refs;
      },
    });

    monaco.languages.registerCodeActionProvider('spl', {
      provideCodeActions: function (model, range, context) {
        const actions = [];
        if (!context.markers || context.markers.length === 0) return { actions: [], dispose: function () {} };
        const first = context.markers[0];
        const msg = (first.message || '').toLowerCase();
        if ((msg.indexOf('undefined') !== -1 || msg.indexOf('possible') !== -1) && range) {
          const word = model.getWordAtPosition({ lineNumber: range.startLineNumber, column: range.startColumn });
          if (word && MODULES.indexOf(word.word) !== -1) {
            const insertLine = 'let ' + word.word + ' = import("' + word.word + '")\n';
            actions.push({
              title: 'Add import: let ' + word.word + ' = import("' + word.word + '")',
              kind: 'quickfix',
              diagnostics: context.markers,
              edit: {
                edits: [{
                  resource: model.uri,
                  textEdit: { range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, text: insertLine },
                }],
              },
            });
          }
        }
        return { actions: actions, dispose: function () {} };
      },
    });

    async function buildProjectSymbolIndex() {
      if (!projectRoot) return;
      try {
        const paths = await window.splIde.listSplFiles(projectRoot);
        const index = {};
        for (const p of paths) {
          try {
            const content = await window.splIde.fs.readFile(p);
            const sym = parseSourceForSymbols(content);
            sym.functions.forEach((f) => {
              if (!index[f.name]) index[f.name] = { definitions: [] };
              index[f.name].definitions.push({ path: p, line: f.line, column: f.column, kind: 'function' });
            });
            sym.variables.forEach((v) => {
              if (!index[v.name]) index[v.name] = { definitions: [] };
              index[v.name].definitions.push({ path: p, line: v.line, column: v.column, kind: 'variable' });
            });
          } catch (_) {}
        }
        projectSymbolIndex = index;
      } catch (_) {}
    }

    // Restore saved theme before creating editor so body class and Monaco theme match
    try {
      const savedTheme = localStorage.getItem('spl-ide-theme');
      if (savedTheme === 'light' || savedTheme === 'midnight' || savedTheme === 'dark') {
        document.body.classList.remove('theme-dark', 'theme-light', 'theme-midnight');
        document.body.classList.add('theme-' + savedTheme);
      }
    } catch (_) {}
    const storedFontSize = parseInt(localStorage.getItem('spl-ide-fontSize'), 10);
    editorFontSize = (storedFontSize >= 10 && storedFontSize <= 36) ? storedFontSize : 14;
    const storedTabSize = parseInt(localStorage.getItem('spl-ide-tabSize'), 10);
    editorTabSize = (storedTabSize >= 2 && storedTabSize <= 8) ? storedTabSize : 4;
    lineNumbersVisible = localStorage.getItem('spl-ide-lineNumbers') !== 'off';
    const minimapEnabled = localStorage.getItem('spl-ide-minimap') !== 'off';
    renderWhitespace = localStorage.getItem('spl-ide-renderWhitespace') === 'all' ? 'all' : (localStorage.getItem('spl-ide-renderWhitespace') === 'boundary' ? 'boundary' : 'selection');
    editor = monaco.editor.create(document.getElementById('editor-container'), {
      language: 'spl',
      theme: (function () { const b = document.body; if (b.classList.contains('theme-midnight')) return 'spl-midnight'; if (b.classList.contains('theme-light')) return 'spl-light'; return 'spl-dark'; })(),
      automaticLayout: true,
      minimap: { enabled: minimapEnabled, maxColumn: 120, scale: 2 },
      lineNumbers: lineNumbersVisible ? 'on' : 'off',
      renderWhitespace: renderWhitespace,
      folding: true,
      bracketPairColorization: { enabled: true },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      renderLineHighlight: 'line',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      quickSuggestions: { other: true, comments: false, strings: true },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      tabCompletion: 'on',
      wordBasedSuggestions: 'matchingDocuments',
      fontSize: editorFontSize,
      tabSize: editorTabSize,
      wordWrap: localStorage.getItem('spl-ide-wordWrap') === 'on' ? 'on' : 'off',
      guides: { bracketPairs: true, bracketPairsHorizontal: true, highlightActiveBracketPair: true },
      indentGuides: true,
      parameterHints: { enabled: true, cycle: true },
      suggest: { showKeywords: true, showSnippets: true, showFunctions: true, showVariables: true, preview: true, previewMode: 'subword' },
      occurrencesHighlight: true,
      glyphMargin: true,
      fontLigatures: true,
      matchBrackets: 'always',
      breadcrumbs: { enabled: true },
    });
    // Set theme button label to match current theme (saved or default)
    (function () {
      const btn = document.getElementById('btn-theme');
      if (btn) {
        if (document.body.classList.contains('theme-light')) btn.textContent = 'Light';
        else if (document.body.classList.contains('theme-midnight')) btn.textContent = 'Midnight';
        else btn.textContent = 'Dark';
      }
    })();

    function runBuiltinAction(ed, actionId) {
      if (!ed) return;
      const a = ed.getAction ? ed.getAction(actionId) : null;
      if (a && typeof a.run === 'function') a.run();
    }
    editor.addAction({ id: 'spl-comment-line', label: 'Toggle Line Comment', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash], run: function (ed) { runBuiltinAction(ed, 'editor.action.commentLine'); } });
    editor.addAction({ id: 'spl-comment-block', label: 'Toggle Block Comment', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Slash], run: function (ed) { runBuiltinAction(ed, 'editor.action.blockComment'); } });
    editor.addAction({ id: 'spl-goto-symbol', label: 'Go to Symbol in File', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyO], run: function (ed) { runBuiltinAction(ed, 'editor.action.quickOutline'); } });
    editor.addAction({ id: 'spl-duplicate-line', label: 'Duplicate Line', keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow], run: function (ed) { runBuiltinAction(ed, 'editor.action.copyLinesDownAction'); } });
    editor.addAction({ id: 'spl-delete-line', label: 'Delete Line', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK], run: function (ed) { runBuiltinAction(ed, 'editor.action.deleteLines'); } });
    editor.addAction({ id: 'spl-move-line-up', label: 'Move Line Up', keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.UpArrow], run: function (ed) { runBuiltinAction(ed, 'editor.action.moveLinesUpAction'); } });
    editor.addAction({ id: 'spl-move-line-down', label: 'Move Line Down', keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.DownArrow], run: function (ed) { runBuiltinAction(ed, 'editor.action.moveLinesDownAction'); } });
    editor.addAction({ id: 'spl-expand-selection', label: 'Expand Selection', keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.RightArrow], run: function (ed) { runBuiltinAction(ed, 'editor.action.expandSelection'); } });
    editor.addAction({ id: 'spl-shrink-selection', label: 'Shrink Selection', keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.LeftArrow], run: function (ed) { runBuiltinAction(ed, 'editor.action.shrinkSelection'); } });
    editor.addAction({ id: 'spl-add-selection-to-next', label: 'Add Selection to Next Find Match', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD], run: function (ed) { runBuiltinAction(ed, 'editor.action.addSelectionToNextFindMatch'); } });
    editor.addAction({ id: 'spl-select-all-occurrences', label: 'Select All Occurrences of Find Match', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL], run: function (ed) { runBuiltinAction(ed, 'editor.action.selectHighlights'); } });
    editor.addAction({ id: 'spl-indent-lines', label: 'Indent Line', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketRight], run: function (ed) { runBuiltinAction(ed, 'editor.action.indentLines'); } });
    editor.addAction({ id: 'spl-outdent-lines', label: 'Outdent Line', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketLeft], run: function (ed) { runBuiltinAction(ed, 'editor.action.outdentLines'); } });
    editor.addAction({ id: 'spl-insert-line-below', label: 'Insert Line Below', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter], run: function (ed) { runBuiltinAction(ed, 'editor.action.insertLineAfter'); } });
    editor.addAction({ id: 'spl-insert-line-above', label: 'Insert Line Above', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter], run: function (ed) { runBuiltinAction(ed, 'editor.action.insertLineBefore'); } });
    editor.addAction({ id: 'spl-goto-next-problem', label: 'Go to Next Problem', keybindings: [monaco.KeyCode.F8], run: function () { goToNextProblem(); } });
    editor.addAction({ id: 'spl-goto-prev-problem', label: 'Go to Previous Problem', keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.F8], run: function () { goToPreviousProblem(); } });
    editor.addAction({ id: 'spl-uppercase', label: 'Transform to Uppercase', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyU], run: function (ed) { runBuiltinAction(ed, 'editor.action.transformToUppercase'); } });
    editor.addAction({ id: 'spl-lowercase', label: 'Transform to Lowercase', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyU], run: function (ed) { runBuiltinAction(ed, 'editor.action.transformToLowercase'); } });
    editor.addAction({ id: 'spl-join-lines', label: 'Join Lines', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyJ], run: function (ed) { runBuiltinAction(ed, 'editor.action.joinLines'); } });
    editor.addAction({ id: 'spl-cursor-above', label: 'Insert Cursor Above', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.UpArrow], run: function (ed) { runBuiltinAction(ed, 'editor.action.insertCursorAbove'); } });
    editor.addAction({ id: 'spl-cursor-below', label: 'Insert Cursor Below', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow], run: function (ed) { runBuiltinAction(ed, 'editor.action.insertCursorBelow'); } });
    editor.addAction({ id: 'spl-split-line', label: 'Split Line', run: function (ed) { runBuiltinAction(ed, 'editor.action.splitLine'); } });
    editor.addAction({ id: 'spl-run-selection', label: 'Run Selection in REPL', keybindings: [monaco.KeyCode.F9], run: function () { runSelection(); } });
    (function () {
      const container = document.getElementById('editor-container');
      if (!container) return;
      container.addEventListener('paste', function () {
        if (localStorage.getItem('spl-ide-formatOnPaste') !== 'true') return;
        setTimeout(function () { if (typeof formatDocument === 'function') formatDocument(); }, 100);
      });
    })();
    editor.addAction({ id: 'spl-scroll-line-up', label: 'Scroll Line Up', run: function (ed) { runBuiltinAction(ed, 'editor.action.scrollLineUp'); } });
    editor.addAction({ id: 'spl-scroll-line-down', label: 'Scroll Line Down', run: function (ed) { runBuiltinAction(ed, 'editor.action.scrollLineDown'); } });
    editor.addAction({ id: 'spl-center-line', label: 'Center Line in View', run: function (ed) { const p = ed.getPosition(); if (p) ed.revealLineInCenter(p.lineNumber); } });
    editor.addAction({ id: 'spl-transpose-letters', label: 'Transpose Letters', run: function (ed) { runBuiltinAction(ed, 'editor.action.transposeLetters'); } });
    editor.addAction({ id: 'spl-select-line', label: 'Select Line', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL], run: function (ed) { runBuiltinAction(ed, 'editor.action.expandLineSelection'); } });
    editor.addAction({ id: 'spl-delete-word-left', label: 'Delete Word Left', run: function (ed) { runBuiltinAction(ed, 'editor.action.deleteWordLeft'); } });
    editor.addAction({ id: 'spl-delete-word-right', label: 'Delete Word Right', run: function (ed) { runBuiltinAction(ed, 'editor.action.deleteWordRight'); } });
    editor.addAction({ id: 'spl-copy-line-up', label: 'Copy Line Up', keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.UpArrow], run: function (ed) { runBuiltinAction(ed, 'editor.action.copyLinesUpAction'); } });
    editor.addAction({ id: 'spl-next-tab', label: 'Next Tab', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Tab], run: function () { nextTab(); } });
    editor.addAction({ id: 'spl-prev-tab', label: 'Previous Tab', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Tab], run: function () { prevTab(); } });
    editor.addAction({ id: 'spl-scroll-page-up', label: 'Scroll Page Up', run: function (ed) { runBuiltinAction(ed, 'editor.action.scrollPageUp'); } });
    editor.addAction({ id: 'spl-scroll-page-down', label: 'Scroll Page Down', run: function (ed) { runBuiltinAction(ed, 'editor.action.scrollPageDown'); } });

    function on(id, ev, fn) { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); }
    on('btn-theme', 'click', toggleTheme);
    on('btn-open-folder', 'click', openFolder);
    on('btn-open-file', 'click', openFileDialog);
    on('btn-save', 'click', () => saveCurrent().catch(err => appendOutput('Save error: ' + err.message + '\n')));
    on('btn-run', 'click', runCurrent);
    on('btn-run-file', 'click', runCurrentFile);
    const overlayCheckbox = document.getElementById('overlay-checkbox');
    if (overlayCheckbox) {
      overlayCheckbox.addEventListener('change', () => { runWithOverlay = overlayCheckbox.checked; });
      runWithOverlay = overlayCheckbox.checked;
    }
    on('btn-format', 'click', formatDocument);
    on('btn-new-file', 'click', newFile);
    on('btn-repl', 'click', toggleRepl);
    on('btn-sidebar-toggle', 'click', toggleSidebar);
    on('btn-find', 'click', () => { if (editor) { const a = editor.getAction && editor.getAction('editor.action.startFindAction'); if (a && a.run) a.run(); } });
    on('btn-replace', 'click', () => { if (editor) { const a = editor.getAction && editor.getAction('editor.action.startFindReplaceAction'); if (a && a.run) a.run(); } });
    on('btn-panel', 'click', togglePanel);
    on('btn-docs', 'click', () => document.getElementById('doc-panel')?.classList.remove('hidden'));
    on('btn-close-docs', 'click', () => document.getElementById('doc-panel')?.classList.add('hidden'));
    on('welcome-run', 'click', () => runCurrent());
    on('welcome-new', 'click', () => newFile());
    on('welcome-open', 'click', () => openFileDialog());
    on('welcome-shortcuts', 'click', () => showShortcutsInDoc());
    on('welcome-folder', 'click', () => openFolder());
    on('btn-sidebar-new-folder', 'click', newFolder);
    on('btn-sidebar-new-file', 'click', newFile);
    on('btn-clear-output', 'click', clearOutput);
    on('btn-close-panel', 'click', () => { panelVisible = false; document.getElementById('panel')?.classList.add('hidden'); });
    on('btn-stop', 'click', stopRun);

    async function refreshAstView() {
      const pre = document.getElementById('ast-output');
      if (!pre) return;
      const source = editor.getModel() ? editor.getModel().getValue() : '';
      pre.textContent = 'Loading...';
      try {
        const { stdout, stderr, code } = await window.splIde.splCapture(['--ast'], source);
        pre.textContent = code === 0 ? stdout : (stderr || stdout || 'Parse error.');
      } catch (e) {
        pre.textContent = 'Error: ' + (e.message || e);
      }
    }
    async function refreshBytecodeView() {
      const pre = document.getElementById('bytecode-output');
      if (!pre) return;
      const source = editor.getModel() ? editor.getModel().getValue() : '';
      pre.textContent = 'Loading...';
      try {
        const { stdout, stderr, code } = await window.splIde.splCapture(['--bytecode'], source);
        pre.textContent = code === 0 ? stdout : (stderr || stdout || 'Compile error.');
      } catch (e) {
        pre.textContent = 'Error: ' + (e.message || e);
      }
    }

    // Panel tabs (only .panel-tab with data-tab)
    document.querySelectorAll('.panel-tab[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        if (tab === 'output') document.getElementById('panel-output').classList.add('active');
        else if (tab === 'terminal') { document.getElementById('panel-terminal').classList.add('active'); ensureTerminal(); }
        else if (tab === 'problems') document.getElementById('panel-problems').classList.add('active');
        else if (tab === 'ast') { document.getElementById('panel-ast').classList.add('active'); refreshAstView(); }
        else if (tab === 'bytecode') { document.getElementById('panel-bytecode').classList.add('active'); refreshBytecodeView(); }
      });
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveCurrent().catch(err => appendOutput('Save error: ' + err.message + '\n')); }
      if (e.key === 'F5') { e.preventDefault(); runCurrent(); }
      if (e.ctrlKey && e.key === 'g') { e.preventDefault(); goToLine(); }
      if (e.ctrlKey && e.shiftKey && e.key === 'F') { e.preventDefault(); openSearchModal(); }
      if (e.ctrlKey && e.shiftKey && e.key === 'P') { e.preventDefault(); openCommandPalette(); }
      if (e.ctrlKey && e.key === 'p') { e.preventDefault(); openQuickOpen(); }
      if (e.ctrlKey && e.key === 'b') { e.preventDefault(); toggleSidebar(); }
      if (e.ctrlKey && e.shiftKey && e.key === 'T') { e.preventDefault(); reopenClosedTab(); }
      if (e.ctrlKey && e.key === '0') { e.preventDefault(); editorFontSize = 14; if (editor) editor.updateOptions({ fontSize: 14 }); localStorage.setItem('spl-ide-fontSize', '14'); }
      if (e.ctrlKey && e.key === '=') { e.preventDefault(); editorFontSize = Math.min(36, editorFontSize + 2); if (editor) editor.updateOptions({ fontSize: editorFontSize }); localStorage.setItem('spl-ide-fontSize', String(editorFontSize)); }
      if (e.ctrlKey && e.key === '-') { e.preventDefault(); editorFontSize = Math.max(10, editorFontSize - 2); if (editor) editor.updateOptions({ fontSize: editorFontSize }); localStorage.setItem('spl-ide-fontSize', String(editorFontSize)); }
      if (e.key === 'F8') { e.preventDefault(); goToNextProblem(); }
      if (e.shiftKey && e.key === 'F8') { e.preventDefault(); goToPreviousProblem(); }
      if (e.key === 'F9') { e.preventDefault(); runSelection(); }
      if (e.ctrlKey && e.key === '1') { e.preventDefault(); focusEditor(); }
      if (e.ctrlKey && e.key === 'Tab') { e.preventDefault(); nextTab(); }
      if (e.ctrlKey && e.shiftKey && e.key === 'Tab') { e.preventDefault(); prevTab(); }
      if (e.key === 'F12') {
        e.preventDefault();
        const model = editor.getModel();
        if (!model || model.getLanguageId() !== 'spl') return;
        const pos = editor.getPosition();
        const word = model.getWordAtPosition(pos);
        if (!word) { editor.getAction('editor.action.revealDefinition').run(); return; }
        const name = word.word;
        const defs = projectSymbolIndex[name] && projectSymbolIndex[name].definitions;
        const defInOther = defs && defs.find((d) => d.path !== activeTabId);
        if (defInOther) {
          openFile(defInOther.path).then(() => {
            editor.revealLine(defInOther.line);
            editor.setPosition({ lineNumber: defInOther.line, column: defInOther.column });
            editor.focus();
          });
          return;
        }
        editor.getAction('editor.action.revealDefinition').run();
      }
    });

    window.splIde.onSpawnData((id, data, isStderr) => {
      const outEl = document.getElementById('terminal-output');
      const replEl = document.getElementById('repl-output');
      const termEl = document.getElementById('integrated-terminal-output');
      if (replProcessId === id && document.getElementById('repl-area').classList.contains('hidden') === false) {
        if (replEl) { replEl.textContent += data; replEl.scrollTop = replEl.scrollHeight; }
      } else if (terminalProcessId === id && termEl) {
        termEl.textContent += data;
        termEl.scrollTop = termEl.scrollHeight;
      } else if (runProcessId === id && runWithOverlay && !isStderr) {
        overlayLineBuffer += data;
        const lines = overlayLineBuffer.split(/\r\n|\r|\n/);
        overlayLineBuffer = lines.pop() || '';
        let visible = '';
        lines.forEach((line) => {
          if (/^\s*OVERLAY:/i.test(line)) {
            const cmd = parseOverlayLine(line);
            applyOverlayCommand(cmd);
          } else visible += line + '\n';
        });
        if (outEl && visible) { outEl.textContent += visible; outEl.scrollTop = outEl.scrollHeight; }
      } else if (runProcessId === id && runWithOverlay && isStderr) {
        if (outEl) { outEl.textContent += data; outEl.scrollTop = outEl.scrollHeight; }
        parseErrorsFromStderr(data);
      } else {
        if (outEl) { outEl.textContent += data; outEl.scrollTop = outEl.scrollHeight; }
        if (isStderr && runProcessId === id) parseErrorsFromStderr(data);
      }
    });
    window.splIde.onSpawnExit((id) => {
      if (id === replProcessId) replProcessId = null;
      if (id === runProcessId) {
        runProcessId = null;
        const bs = document.getElementById('btn-stop'), br = document.getElementById('btn-run');
        if (bs) bs.classList.add('hidden'); if (br) br.classList.remove('hidden');
      }
      if (id === terminalProcessId) terminalProcessId = null;
    });

    const replInput = document.getElementById('repl-input');
    replInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const line = replInput.value;
      replInput.value = '';
      if (!line.trim()) return;
      const out = document.getElementById('repl-output');
      out.textContent += '> ' + line + '\n';
      if (replProcessId) window.splIde.spawnWrite(replProcessId, line + '\n');
      out.scrollTop = out.scrollHeight;
    });

    let outlineTodoTimer = null;
    function debounceOutlineAndTodo() {
      if (outlineTodoTimer) clearTimeout(outlineTodoTimer);
      outlineTodoTimer = setTimeout(() => {
        const model = editor.getModel();
        const sym = model && model.getLanguageId() === 'spl' ? getCachedSymbols(model) : null;
        renderOutline(sym);
        scanTodo();
        outlineTodoTimer = null;
      }, 300);
    }
    editor.onDidChangeCursorPosition(debounceStatus);
    editor.onDidChangeModelContent(() => {
      debounceDirty();
      debounceValidation();
      debounceOutlineAndTodo();
    });

    loadDocPanel();
    initSidebar();
    updateWelcomeVisibility();
    updateStatusBar();
    if (window.splIde && typeof window.splIde.getSplVersion === 'function') {
      window.splIde.getSplVersion().then(function (v) { splVersionText = v || ''; updateStatusBar(); });
    }
  });

  function applyTheme(themeId) {
    const body = document.body;
    const btn = document.getElementById('btn-theme');
    body.classList.remove('theme-dark', 'theme-light', 'theme-midnight');
    if (themeId === 'light') {
      body.classList.add('theme-light');
      if (btn) btn.textContent = 'Light';
      if (editor) editor.updateOptions({ theme: 'spl-light' });
    } else if (themeId === 'midnight') {
      body.classList.add('theme-midnight');
      if (btn) btn.textContent = 'Midnight';
      if (editor) editor.updateOptions({ theme: 'spl-midnight' });
    } else {
      body.classList.add('theme-dark');
      if (btn) btn.textContent = 'Dark';
      if (editor) editor.updateOptions({ theme: 'spl-dark' });
    }
    try { localStorage.setItem('spl-ide-theme', themeId); } catch (_) {}
  }
  function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('theme-dark')) applyTheme('light');
    else if (body.classList.contains('theme-light')) applyTheme('midnight');
    else applyTheme('dark');
  }
  function setThemeDark() { applyTheme('dark'); }
  function setThemeLight() { applyTheme('light'); }
  function setThemeMidnight() { applyTheme('midnight'); }

  function togglePanel() {
    panelVisible = !panelVisible;
    const panel = document.getElementById('panel');
    if (panelVisible) panel.classList.remove('hidden'); else panel.classList.add('hidden');
  }

  let sidebarVisible = true;
  function toggleSidebar() {
    sidebarVisible = !sidebarVisible;
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('hidden', !sidebarVisible);
  }

  function openKeyboardShortcuts() {
    const modal = document.getElementById('shortcuts-modal');
    const listEl = document.getElementById('shortcuts-list');
    if (!modal || !listEl) return;
    listEl.innerHTML = COMMANDS.filter(function (c) { return c.shortcut; }).map(function (c) {
      return '<div class="shortcut-row"><span class="shortcut-cmd">' + escapeHtml(c.label) + '</span><kbd>' + escapeHtml(c.shortcut) + '</kbd></div>';
    }).join('');
    modal.classList.remove('hidden');
    modal.onclick = function (e) { if (e.target === modal) { modal.classList.add('hidden'); editor?.focus(); } };
    const closeBtn = document.getElementById('shortcuts-close');
    if (closeBtn) closeBtn.onclick = function () { modal.classList.add('hidden'); editor?.focus(); };
  }

  function openSettings() {
    const modal = document.getElementById('settings-modal');
    const fontSizeEl = document.getElementById('settings-fontSize');
    const tabSizeEl = document.getElementById('settings-tabSize');
    const wordWrapEl = document.getElementById('settings-wordWrap');
    const formatOnSaveEl = document.getElementById('settings-formatOnSave');
    if (!modal || !fontSizeEl) return;
    fontSizeEl.value = String(editorFontSize);
    tabSizeEl.value = String(editorTabSize);
    wordWrapEl.checked = localStorage.getItem('spl-ide-wordWrap') === 'on';
    formatOnSaveEl.checked = localStorage.getItem('spl-ide-formatOnSave') === 'true';
    const formatOnPasteEl = document.getElementById('settings-formatOnPaste');
    if (formatOnPasteEl) formatOnPasteEl.checked = localStorage.getItem('spl-ide-formatOnPaste') === 'true';
    const trimTrailingEl = document.getElementById('settings-trimTrailing');
    if (trimTrailingEl) trimTrailingEl.checked = localStorage.getItem('spl-ide-trimTrailing') === 'true';
    const lineNumbersEl = document.getElementById('settings-lineNumbers');
    const minimapEl = document.getElementById('settings-minimap');
    if (lineNumbersEl) lineNumbersEl.checked = lineNumbersVisible;
    if (minimapEl) minimapEl.checked = localStorage.getItem('spl-ide-minimap') !== 'off';
    modal.classList.remove('hidden');
    fontSizeEl.focus();
    function closeSettings() {
      modal.classList.add('hidden');
      editor?.focus();
    }
    function saveSettings() {
      let fs = parseInt(fontSizeEl.value, 10);
      let ts = parseInt(tabSizeEl.value, 10);
      if (isNaN(fs) || fs < 10 || fs > 36) fs = 14;
      if (isNaN(ts) || ts < 2 || ts > 8) ts = 4;
      editorFontSize = fs;
      editorTabSize = ts;
      localStorage.setItem('spl-ide-fontSize', String(fs));
      localStorage.setItem('spl-ide-tabSize', String(ts));
      localStorage.setItem('spl-ide-wordWrap', wordWrapEl.checked ? 'on' : 'off');
      localStorage.setItem('spl-ide-formatOnSave', formatOnSaveEl.checked ? 'true' : 'false');
      if (formatOnPasteEl) localStorage.setItem('spl-ide-formatOnPaste', formatOnPasteEl.checked ? 'true' : 'false');
      const trimEl = document.getElementById('settings-trimTrailing');
      if (trimEl) localStorage.setItem('spl-ide-trimTrailing', trimEl.checked ? 'true' : 'false');
      const lnEl = document.getElementById('settings-lineNumbers');
      const mmEl = document.getElementById('settings-minimap');
      if (lnEl) { lineNumbersVisible = lnEl.checked; localStorage.setItem('spl-ide-lineNumbers', lineNumbersVisible ? 'on' : 'off'); }
      if (mmEl) localStorage.setItem('spl-ide-minimap', mmEl.checked ? 'on' : 'off');
      if (editor) {
        const opts = { fontSize: fs, tabSize: ts, wordWrap: wordWrapEl.checked ? 'on' : 'off' };
        if (lnEl) opts.lineNumbers = lnEl.checked ? 'on' : 'off';
        if (mmEl) opts.minimap = { enabled: mmEl.checked, maxColumn: 120, scale: 2 };
        editor.updateOptions(opts);
      }
      wordWrapEnabled = wordWrapEl.checked;
      closeSettings();
    }
    document.getElementById('settings-close').onclick = closeSettings;
    document.getElementById('settings-cancel').onclick = closeSettings;
    document.getElementById('settings-save').onclick = saveSettings;
    modal.onclick = (e) => { if (e.target === modal) closeSettings(); };
  }

  function clearOutput() {
    const el = document.getElementById('terminal-output');
    if (el) el.textContent = '';
  }
  function clearTerminal() {
    const el = document.getElementById('integrated-terminal-output');
    if (el) el.textContent = '';
  }

  function parseErrorsFromStderr(text) {
    const list = [];
    let m;
    const stripAnsi = (s) => s.replace(/\033\[[0-9;]*m/g, '').trim();
    // SPL compiler (--check): "path:line:column: SyntaxError: message" — parse line-by-line so path can contain colons
    text.split(/\r\n|\r|\n/).forEach((line) => {
      const match = line.match(/:(\d+):(\d+):\s*(.+)$/);
      if (match) {
        const lineNum = parseInt(match[1], 10);
        const colNum = parseInt(match[2], 10);
        let msg = stripAnsi(match[3]);
        if (/^[\w]+:\s*/.test(msg)) msg = msg.replace(/^[\w]+:\s*/, '');
        list.push({ line: lineNum, column: colNum, message: msg, severity: 'error' });
      }
    });
    // Legacy: Lexer/Parse error at L:C: msg
    if (list.length === 0) {
      const atLineCol = /(?:Lexer|Parse) error at (\d+):(\d+):\s*(.+)/g;
      while ((m = atLineCol.exec(text)) !== null) {
        list.push({ line: parseInt(m[1], 10), column: parseInt(m[2], 10), message: m[3].trim(), severity: 'error' });
      }
    }
    // Runtime error at line L: msg
    const atLine = /Runtime error at line (\d+):\s*(.+)/g;
    while ((m = atLine.exec(text)) !== null) {
      list.push({ line: parseInt(m[1], 10), column: 1, message: m[2].trim(), severity: 'error' });
    }
    // Runtime error: msg (no line)
    if (list.length === 0 && /Runtime error:\s*.+/.test(text)) {
      const simple = /Runtime error:\s*(.+)/.exec(text);
      if (simple) list.push({ line: 0, column: 0, message: simple[1].trim(), severity: 'error' });
    }
    problems = list;
    renderProblems();
  }

  function renderProblems() {
    const model = editor.getModel();
    if (model) {
      const markers = problems.map(p => ({
        severity: monaco.MarkerSeverity.Error,
        message: p.message,
        startLineNumber: p.line || 1,
        startColumn: p.column || 1,
        endLineNumber: p.line || 1,
        endColumn: Math.max((p.column || 1) + 1, 2),
      }));
      monaco.editor.setModelMarkers(model, 'spl', markers);
      if (problems.length === 0 && errorDecorations.length > 0)
        errorDecorations = model.deltaDecorations(errorDecorations, []);
    } else {
      errorDecorations = [];
    }
    const container = document.getElementById('problems-list');
    const tabBtn = document.querySelector('.panel-tab[data-tab="problems"]');
    container.innerHTML = '';
    if (problems.length === 0) {
      container.innerHTML = '<div class="problems-empty">No problems.</div>';
      if (tabBtn) tabBtn.textContent = 'Problems';
      return;
    }
    if (tabBtn) tabBtn.textContent = 'Problems (' + problems.length + ')';
    problems.forEach((p) => {
      const item = document.createElement('div');
      item.className = 'problem-item ' + (p.severity || 'error');
      const loc = p.line > 0 ? (p.column > 0 ? `Line ${p.line}, Col ${p.column}` : `Line ${p.line}`) : '';
      item.innerHTML = '<span class="location">' + escapeHtml(loc) + '</span><span class="message">' + escapeHtml(p.message) + '</span>';
      item.addEventListener('click', () => {
        if (p.line > 0) {
          editor.revealLine(p.line);
          editor.setPosition({ lineNumber: p.line, column: p.column || 1 });
          editor.focus();
        }
      });
      container.appendChild(item);
    });
    const sidebarProblems = document.getElementById('sidebar-problems-list');
    const sidebarCount = document.getElementById('sidebar-problems-count');
    if (sidebarProblems) {
      sidebarProblems.innerHTML = '';
      if (problems.length === 0) sidebarProblems.innerHTML = '<div class="problems-empty">No problems.</div>';
      else problems.forEach((p) => {
        const it = document.createElement('div');
        it.className = 'sidebar-problem-item ' + (p.severity || 'error');
        const loc = p.line > 0 ? (p.column > 0 ? `L${p.line}:${p.column}` : `L${p.line}`) : '';
        it.innerHTML = '<span class="loc">' + escapeHtml(loc) + '</span> <span class="msg">' + escapeHtml(p.message) + '</span>';
        it.addEventListener('click', () => {
          if (p.line > 0) { editor.revealLine(p.line); editor.setPosition({ lineNumber: p.line, column: p.column || 1 }); editor.focus(); }
        });
        sidebarProblems.appendChild(it);
      });
    }
    if (sidebarCount) { sidebarCount.textContent = problems.length; sidebarCount.dataset.count = problems.length; }
    debounceStatus();
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML;
  }

  // Escape path for use in querySelector [data-path="..."] (backslashes and quotes)
  function selectorPath(path) {
    if (path == null) return '';
    return String(path).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function updateStatusBar() {
    if (!editor) return;
    const pos = editor.getPosition();
    const posEl = document.getElementById('status-position');
    if (posEl) posEl.textContent = pos ? 'Ln ' + pos.lineNumber + ', Col ' + pos.column : 'Ln 1, Col 1';
    const model = editor.getModel();
    const statsEl = document.getElementById('status-stats');
    if (statsEl && model) {
      const lines = model.getLineCount();
      const text = model.getValue();
      const chars = text.length;
      const chStr = chars >= 1000 ? (chars / 1000).toFixed(1) + 'k' : String(chars);
      if (chars < 50000) {
        const words = text.split(/\s+/).filter(Boolean).length;
        const wStr = words >= 1000 ? (words / 1000).toFixed(1) + 'k' : String(words);
        statsEl.textContent = lines + ' L | ' + chStr + ' ch | ' + wStr + ' W';
        statsEl.title = lines + ' lines, ' + chars + ' characters, ' + words + ' words';
      } else {
        statsEl.textContent = lines + ' L | ' + chStr + ' ch';
        statsEl.title = lines + ' lines, ' + chars + ' characters';
      }
    }
    const problemsEl = document.getElementById('status-problems');
    if (problemsEl) {
      const n = problems.length;
      problemsEl.textContent = n ? n + ' ' + (n === 1 ? 'error' : 'errors') : '';
      problemsEl.classList.toggle('hidden', n === 0);
      problemsEl.title = n ? 'Errors and warnings' : '';
    }
    const o = activeTabId ? openTabs.get(activeTabId) : null;
    const dirty = !!(o && o.dirty);
    const unsavedEl = document.getElementById('status-unsaved');
    if (unsavedEl) { if (dirty) unsavedEl.classList.remove('hidden'); else unsavedEl.classList.add('hidden'); }
    const langEl = document.getElementById('status-language');
    if (langEl) langEl.textContent = 'SPL';
    const verEl = document.getElementById('status-version');
    if (verEl) verEl.textContent = splVersionText;
    const path = activeTabId ? activeTabId : (dirty ? '(unsaved)' : '');
    const pathEl = document.getElementById('status-path');
    if (pathEl) { pathEl.textContent = path; pathEl.title = path; }
  }

  function goToLine() {
    const model = editor.getModel();
    if (!model) return;
    const total = model.getLineCount();
    const line = prompt('Go to line (1–' + total + '):', String(editor.getPosition()?.lineNumber || 1));
    if (line == null || line === '') return;
    const n = parseInt(line, 10);
    if (n >= 1 && n <= total) {
      editor.revealLine(n);
      editor.setPosition({ lineNumber: n, column: 1 });
      editor.focus();
    }
  }

  function goToNextProblem() {
    if (problems.length === 0) return;
    const pos = editor.getPosition();
    const currentLine = pos ? pos.lineNumber : 0;
    let idx = problems.findIndex(function (p) { return (p.line || 0) > currentLine; });
    if (idx === -1) idx = 0;
    const p = problems[idx];
    editor.revealLine(p.line || 1);
    editor.setPosition({ lineNumber: p.line || 1, column: p.column || 1 });
    editor.focus();
  }

  function goToPreviousProblem() {
    if (problems.length === 0) return;
    const pos = editor.getPosition();
    const currentLine = pos ? pos.lineNumber : 999999;
    let idx = -1;
    for (let i = problems.length - 1; i >= 0; i--) { if ((problems[i].line || 0) < currentLine) { idx = i; break; } }
    if (idx === -1) idx = problems.length - 1;
    const p = problems[idx];
    editor.revealLine(p.line || 1);
    editor.setPosition({ lineNumber: p.line || 1, column: p.column || 1 });
    editor.focus();
  }

  function stopRun() {
    if (runProcessId) {
      window.splIde.spawnKill(runProcessId);
      runProcessId = null;
      const bs = document.getElementById('btn-stop'), br = document.getElementById('btn-run');
      if (bs) bs.classList.add('hidden'); if (br) br.classList.remove('hidden');
    }
  }

  function updateTabDirty(filePath) {
    const tab = document.querySelector('.tab[data-path="' + selectorPath(filePath) + '"]');
    if (tab) tab.classList.toggle('dirty', openTabs.get(filePath)?.dirty);
  }

  function renderOutline(cachedSymbols) {
    const list = document.getElementById('outline-list');
    if (!list) return;
    list.innerHTML = '';
    const model = editor.getModel();
    if (!model || model.getLanguageId() !== 'spl') { list.innerHTML = '<div class="problems-empty">Open an SPL file.</div>'; return; }
    const symbols = cachedSymbols;
    if (!symbols) return;
    if (symbols.functions.length === 0 && symbols.variables.length === 0) { list.innerHTML = '<div class="problems-empty">No symbols.</div>'; return; }
    if (symbols.functions.length > 0) {
      const group = document.createElement('div');
      group.className = 'outline-group-title';
      group.textContent = 'Functions';
      list.appendChild(group);
      symbols.functions.forEach((f) => {
        const it = document.createElement('div');
        it.className = 'outline-item';
        it.innerHTML = '<span class="outline-kind">fn</span>' + escapeHtml(f.name) + '()';
        it.addEventListener('click', () => { editor.revealLine(f.line); editor.setPosition({ lineNumber: f.line, column: f.column }); editor.focus(); });
        list.appendChild(it);
      });
    }
    if (symbols.variables.length > 0) {
      const group = document.createElement('div');
      group.className = 'outline-group-title';
      group.textContent = 'Variables';
      list.appendChild(group);
      symbols.variables.forEach((v) => {
        const it = document.createElement('div');
        it.className = 'outline-item';
        it.innerHTML = '<span class="outline-kind">let</span>' + escapeHtml(v.name);
        it.addEventListener('click', () => { editor.revealLine(v.line); editor.setPosition({ lineNumber: v.line, column: v.column }); editor.focus(); });
        list.appendChild(it);
      });
    }
  }

  function scanTodo() {
    const list = document.getElementById('sidebar-todo-list');
    const badge = document.getElementById('sidebar-todo-count');
    if (!list) return;
    const todos = [];
    const re = /\/\/\s*(TODO|FIXME|NOTE)\s*[:\-]?\s*(.*)/gi;
    if (editor.getModel() && activeTabId) {
      const text = editor.getModel().getValue();
      const lines = text.split(/\r\n|\r|\n/);
      const name = activeTabId.replace(/^.*[/\\]/, '');
      lines.forEach((line, i) => {
        re.lastIndex = 0;
        const m = re.exec(line);
        if (m) todos.push({ file: name, path: activeTabId, line: i + 1, tag: m[1], text: m[2].trim() });
      });
    }
    list.innerHTML = '';
    if (todos.length === 0) { list.innerHTML = '<div class="problems-empty">No TODO/FIXME/NOTE.</div>'; if (badge) { badge.textContent = '0'; badge.dataset.count = '0'; } return; }
    todos.forEach((t) => {
      const it = document.createElement('div');
      it.className = 'sidebar-todo-item';
      it.innerHTML = '<span class="loc">' + escapeHtml(t.file) + ':' + t.line + '</span> <span class="tag">' + escapeHtml(t.tag) + '</span> <span class="msg">' + escapeHtml(t.text) + '</span>';
      it.addEventListener('click', () => { editor.revealLine(t.line); editor.setPosition({ lineNumber: t.line, column: 1 }); editor.focus(); });
      list.appendChild(it);
    });
    if (badge) { badge.textContent = todos.length; badge.dataset.count = todos.length; }
  }

  let contextMenuPath = null;
  let contextMenuIsDir = false;
  function initSidebar() {
    document.querySelectorAll('.sidebar-section-header').forEach((h) => {
      const section = h.closest('.sidebar-section');
      if (!section) return;
      h.addEventListener('click', (e) => {
        if (e.target.classList.contains('sidebar-section-toggle') || e.target.closest('.sidebar-section-toggle')) {
          section.classList.toggle('collapsed');
          const toggle = section.querySelector('.sidebar-section-toggle');
          if (toggle) toggle.textContent = section.classList.contains('collapsed') ? '▶' : '▼';
        }
      });
    });
    document.querySelectorAll('.sidebar-section-toggle').forEach((t) => { t.textContent = '▼'; });
    const filterInput = document.getElementById('sidebar-explorer-filter');
    if (filterInput) filterInput.addEventListener('input', () => {
      const q = (filterInput.value || '').trim().toLowerCase();
      function anyDescendantMatches(el) {
        const children = el.querySelectorAll('.tree-children .tree-item');
        return Array.from(children).some((c) => (c.querySelector('.name') || {}).textContent.toLowerCase().includes(q) || anyDescendantMatches(c));
      }
      document.querySelectorAll('#file-tree .tree-item').forEach((item) => {
        const name = (item.querySelector('.name') || {}).textContent || '';
        const show = !q || name.toLowerCase().includes(q) || (item.querySelector('.tree-children') && anyDescendantMatches(item));
        item.classList.toggle('hidden-by-filter', !show);
      });
    });
    const searchInput = document.getElementById('sidebar-search-input');
    const btnSearch = document.getElementById('btn-sidebar-search');
    if (searchInput && btnSearch) {
      const runSearch = () => { openSearchModal(); document.getElementById('search-query').value = searchInput.value; doSearch(); };
      btnSearch.addEventListener('click', runSearch);
      searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });
    }
    const SNIPPETS = [
      { name: 'for range', text: 'for ${1:i} in range(${2:0}, ${3:10}) {\n\t$0\n}' },
      { name: 'for in', text: 'for ${1:x} in ${2:array} {\n\t$0\n}' },
      { name: 'def', text: 'def ${1:name}($2) {\n\t$0\n}' },
      { name: 'if', text: 'if (${1:condition}) {\n\t$0\n}' },
      { name: 'while', text: 'while (${1:condition}) {\n\t$0\n}' },
      { name: 'try/catch', text: 'try {\n\t$0\n} catch (${1:e}) {\n\t$2\n}' },
      { name: 'let', text: 'let ${1:name} = ${0:value}' },
      { name: 'Hello world', text: 'print("Hello, SPL!")\nlet x = 42\nprint(x)' },
      { name: 'class', text: 'class ${1:MyClass} {\n\tdef ${2:method}(self) {\n\t\t$0\n\t}\n}' },
      { name: 'const', text: 'const ${1:NAME} = ${0:value}' },
      { name: 'defer', text: 'defer ${1:cleanup}()' },
      { name: 'assert', text: 'assert (${1:condition}), "${2:message}"' },
      { name: 'f-string', text: 'f"${1:Hello} ${2:{name}}"' },
      { name: 'repeat', text: 'repeat (${1:5}) {\n\t$0\n}' },
      { name: 'match', text: 'match (${1:value}) {\n\tcase ${2:_}: $0\n}' },
      { name: 'import math', text: 'import math\nlet n = math.sqrt(2)\nprint(math.PI)' },
      { name: 'import string', text: 'import string\nlet s = string.upper("hello")\nprint(string.split("a,b,c", ","))' },
      { name: 'import json', text: 'import json\nlet data = json.json_parse(\'{"x": 1}\')\nprint(data)' },
      { name: 'import random', text: 'import random\nlet n = random.random_int(1, 10)\nprint(n)' },
      { name: 'import env', text: 'import env\nlet home = env.env_get("HOME")\nprint(home)' },
      { name: 'read file', text: 'let content = read_file("${1:path.txt}")\nprint(content)' },
      { name: 'read lines', text: 'let content = read_file("${1:path.txt}")\nlet lines = split(content, "\\n")\nfor (line in lines) {\n\t\n}' },
      { name: 'write file', text: 'write_file("${1:path.txt}", ${2:content})' },
      { name: 'main', text: 'def main() {\n\t\n}\n\nmain()' },
      { name: 'test', text: 'def test_${1:name}() {\n\tlet expected = ${2:value}\n\tlet result = ${3:actual}\n\tassert (deep_equal(result, expected))\n}' },
      { name: 'elapsed', text: 'let t0 = time()\n\nprint("elapsed:", time() - t0)' },
      { name: 'alloc / memory', text: 'let buf = alloc(64)\npoke32(buf, 42)\nprint(peek32(buf))\nfree(buf)' },
      { name: 'elif', text: 'elif (${1:condition}) {\n\t$0\n}' },
      { name: 'list comprehension', text: '[ for ${1:x} in ${2:arr} : ${3:expr} ]' },
      { name: 'pipeline', text: '${1:value} |> ${2:fn}' },
      { name: 'guard', text: 'if (!${1:condition}) return${2:}\n$0' },
      { name: 'type check', text: 'if (is_string(${1:value})) {\n\t$0\n}' },
      { name: 'has key', text: 'if (has(${1:map}, "${2:key}")) {\n\t$0\n}' },
      { name: 'map/filter/reduce', text: 'map(${1:arr}, ${2:fn})\nfilter(${1:arr}, ${2:fn})\nreduce(${1:arr}, ${2:fn}, ${3:init})' },
      { name: 'OVERLAY rect', text: 'print("OVERLAY:rect " + str(${1:x}) + " " + str(${2:y}) + " " + str(${3:w}) + " " + str(${4:h}) + " #ff0000")' },
      { name: 'OVERLAY text', text: 'print("OVERLAY:text " + str(${1:x}) + " " + str(${2:y}) + " \\"${3:label}\\" #ffffff")' },
      { name: 'Browser: viewport', text: 'let viewport = { "w": 800, "h": 600 }' },
      { name: 'Browser: fetch_resource', text: 'def fetch_resource(url) {\n\tif (slice(url, 0, 7) == "file://") return read_file(slice(url, 7, len(url)))\n\treturn ""\n}' },
      { name: 'Browser: make_node', text: 'make_node("div", {}, array())' },
      { name: 'Browser: walk_dom', text: 'def walk_dom(node, depth) {\n\tif (node == null) return\n\tlet kids = default(node["children"], array())\n\tfor i in range(0, len(kids)) { walk_dom(kids[i], depth + 1) }\n}' },
      { name: 'Browser: layout box', text: 'make_box(0, 0, viewport["w"], viewport["h"], array())' },
      { name: 'Binary search', text: 'def binary_search(arr, key) {\n\tlet lo = 0\n\tlet hi = len(arr) - 1\n\twhile (lo <= hi) {\n\t\tlet m = int((lo + hi) / 2)\n\t\tif (arr[m] == key) return m\n\t\tif (arr[m] < key) lo = m + 1\n\t\telse hi = m - 1\n\t}\n\treturn -1\n}' },
      { name: 'GCD', text: 'def gcd(a, b) {\n\twhile (b != 0) { let t = b; b = a % b; a = t }\n\treturn a\n}' },
      { name: 'Linked node', text: '{ "value": 0, "next": null }' },
      { name: 'Tree node', text: '{ "value": 0, "left": null, "right": null }' },
      { name: 'Parser peek/advance', text: 'def peek() { if (pos >= len(tokens)) return null; return tokens[pos] }\ndef advance() { if (pos < len(tokens)) pos = pos + 1 }' },
      { name: 'Result ok/err', text: 'def ok(v) { return { "ok": true, "value": v } }\ndef err(e) { return { "ok": false, "error": e } }' },
      { name: 'Option some/none', text: 'def some(x) { return { "some": true, "value": x } }\ndef none() { return { "some": false } }' },
      { name: 'Import math', text: 'let math = import("math")' },
      { name: 'Import io', text: 'let io = import("io")' },
      { name: 'Import json', text: 'let json = import("json")' },
      { name: 'Import path', text: 'let path = import("path")' },
      { name: 'Import string', text: 'let string = import("string")' },
      { name: 'Import time', text: 'let time = import("time")' },
      { name: 'Import random', text: 'let random = import("random")' },
      { name: 'Import sys', text: 'let sys = import("sys")' },
      { name: 'Import collections', text: 'let collections = import("collections")' },
      { name: 'import prelude', text: 'import("lib/spl/prelude.spl")\n// algo, result, testing, string_utils, math_extra, funtools' },
      { name: 'import testing', text: 'import("lib/spl/testing.spl")\nrun_test("name", lambda () => { assert_eq(1, 1) })' },
      { name: 'import algo', text: 'import("lib/spl/algo.spl")\nprint(gcd(12, 18), sum_arr(array(1,2,3)))' },
      { name: 'import result', text: 'import("lib/spl/result.spl")\nlet r = ok(42)\nif (is_ok(r)) print(unwrap(r))' },
      { name: 'pipeline chain', text: '${1:value} |> ${2:fn} |> ${3:fn2}' },
      { name: 'tap (debug pipeline)', text: 'import("lib/spl/funtools.spl")\n${1:x} |> tap(print) |> ${2:next_fn}' },
      { name: 'trace', text: 'import("lib/spl/funtools.spl")\n${1:value} |> trace' },
      { name: 'run_tests', text: 'import("lib/spl/testing.spl")\nlet fails = run_tests(array(\n  array("test1", lambda () => { assert_eq(1, 1) }),\n  array("test2", lambda () => { assert_true(true) })\n))\nprint("failures:", fails)' },
      { name: 'assert_near', text: 'import("lib/spl/testing.spl")\nassert_near(${1:0.1} + ${2:0.2}, ${3:0.3})' },
      { name: 'assert_throws', text: 'import("lib/spl/testing.spl")\nassert_throws(${1:fn})\nassert_throws_msg(${1:fn}, "${2:expected substring}")' },
      { name: 'string_utils', text: 'import("lib/spl/string_utils.spl")\nprint(contains("hello", "ell"), count_sub("aa_aa", "aa"))' },
      { name: 'math_extra', text: 'import("lib/spl/math_extra.spl")\nprint(factorial(5), digits(123), is_even(4))' },
      { name: 'import dict_utils', text: 'import("lib/spl/dict_utils.spl")\nlet m = { "a": 1 }\nprint(get_default(m, "b", 0))' },
      { name: 'import list_utils', text: 'import("lib/spl/list_utils.spl")\nprint(last_index_of(array(1,2,1), 1), rotate_left(array(1,2,3), 1))' },
      { name: 'import io_utils', text: 'import("lib/spl/io_utils.spl")\nlet lines = read_lines("path.txt")\nwrite_lines("out.txt", lines)' },
      { name: 'import num_utils', text: 'import("lib/spl/num_utils.spl")\nprint(round_to_n(3.14159, 2), is_whole(2.0))' },
      { name: 'import stack', text: 'import("lib/spl/stack.spl")\nlet s = stack_new()\nstack_push(s, 1)\nprint(stack_pop(s))' },
      { name: 'import queue', text: 'import("lib/spl/queue.spl")\nlet q = queue_new()\nqueue_enqueue(q, 1)\nprint(queue_dequeue(q))' },
      { name: 'import table', text: 'import("lib/spl/table.spl")\nprint(format_table(array(array(1,2), array(3,4)), " | "))' },
      { name: 'import range_utils', text: 'import("lib/spl/range_utils.spl")\nprint(range_inclusive(1, 3), range_step(0, 10, 2))' },
      { name: 'fibonacci', text: 'import("lib/spl/algo.spl")\nprint(fibonacci(10))' },
      { name: 'is_palindrome', text: 'import("lib/spl/algo.spl")\nprint(is_palindrome("aba"))' },
      { name: 'result and_then', text: 'import("lib/spl/result.spl")\nlet r = and_then(ok(5), lambda (x) => ok(x * 2))' },
      { name: 'expect_true/false', text: 'import("lib/spl/testing.spl")\nexpect_true(1 == 1)\nexpect_false(1 == 2)\nexpect_not_null(array(1))' },
      { name: 'identity/constant', text: 'import("lib/spl/funtools.spl")\nlet id = identity\nlet zero = constant(0)' },
      { name: 'read_json_file', text: 'import("lib/spl/io_utils.spl")\nlet data = read_json_file("config.json")' },
      { name: 'write_json_file', text: 'import("lib/spl/io_utils.spl")\nwrite_json_file("out.json", { "x": 1 })' },
      { name: 'from_pairs', text: 'import("lib/spl/dict_utils.spl")\nlet m = from_pairs(array(array("a", 1), array("b", 2)))' },
      { name: 'pick/omit', text: 'import("lib/spl/dict_utils.spl")\nlet m = { "a": 1, "b": 2 }\nprint(pick(m, array("a")), omit(m, array("b")))' },
      { name: 'take_while/drop_while', text: 'import("lib/spl/list_utils.spl")\nlet arr = array(1, 2, 3, 4)\nprint(take_while(arr, lambda (x) => x < 3))' },
      { name: 'counter_least_common', text: 'import("lib/spl/counter.spl")\nlet c = count_elements(array(1,1,2,2,2))\nprint(least_common(c, 1))' },
      { name: 'split_n', text: 'import("lib/spl/string_utils.spl")\nprint(split_n("a-b-c-d", "-", 2))' },
      { name: 'pad_center', text: 'import("lib/spl/string_utils.spl")\nprint(pad_center("hi", 7, " "))' },
      { name: 'format_table_header', text: 'import("lib/spl/table.spl")\nprint(format_table_header(array("A","B"), array(array(1,2), array(3,4))))' },
      { name: 'if/elif/else chain', text: 'if (${1:cond1}) {\n\t$2\n} elif (${3:cond2}) {\n\t$4\n} else {\n\t$5\n}' },
      { name: 'switch/match value', text: 'match (${1:value}) {\n\tcase ${2:1}: $3\n\tcase ${4:2}: $5\n\tcase _: $6\n}' },
      { name: 'defer cleanup', text: 'defer ${1:close_file}()\n$0' },
      { name: 'panic with message', text: 'panic("${1:error message}")' },
      { name: 'Error type', text: 'let err = Error("${1:message}")\nprint(error_message(err))' },
      { name: 'try/catch/finally', text: 'try {\n\t$0\n} catch (${1:e}) {\n\t$2\n}' },
      { name: 'rethrow', text: 'catch (e) {\n\tprint(e)\n\trethrow\n}' },
      { name: 'loop with break', text: 'while (true) {\n\tif (${1:done}) break\n\t$0\n}' },
      { name: 'loop with continue', text: 'for ${1:x} in ${2:arr} {\n\tif (${3:skip}) continue\n\t$0\n}' },
      { name: 'nested for', text: 'for ${1:i} in range(${2:n}) {\n\tfor ${3:j} in range(${4:m}) {\n\t\t$0\n\t}\n}' },
      { name: 'map result', text: 'let arr = array(1, 2, 3)\nlet out = map(arr, lambda (x) => ${1:x * 2})' },
      { name: 'filter result', text: 'let arr = array(1, 2, 3, 4)\nlet out = filter(arr, lambda (x) => ${1:x > 2})' },
      { name: 'reduce result', text: 'let arr = array(1, 2, 3)\nlet sum = reduce(arr, lambda (a, b) => a + b, 0)' },
      { name: 'zip two arrays', text: 'let a = array(1, 2)\nlet b = array(3, 4)\nprint(zip(a, b))' },
      { name: 'chunk array', text: 'let arr = array(1, 2, 3, 4, 5)\nprint(chunk(arr, 2))' },
      { name: 'unique array', text: 'let arr = array(1, 2, 1, 3)\nprint(unique(arr))' },
      { name: 'first/last', text: 'let arr = array(1, 2, 3)\nprint(first(arr), last(arr))' },
      { name: 'take/drop', text: 'let arr = array(1, 2, 3, 4)\nprint(take(arr, 2), drop(arr, 2))' },
      { name: 'deep_equal', text: 'print(deep_equal(array(1,2), array(1,2)))' },
      { name: 'default value', text: 'let x = default(${1:maybe_null}, ${2:default_val})' },
      { name: 'merge maps', text: 'let m = merge({ "a": 1 }, { "b": 2 })' },
      { name: 'all/any', text: 'print(all(array(1,2,3), lambda (x) => x > 0))\nprint(any(array(0,0,1), lambda (x) => x > 0))' },
      { name: 'type check', text: 'if (type(${1:x}) == "${2:number}") {\n\t$0\n}' },
      { name: 'is_string/is_array', text: 'if (is_string(${1:x})) { }\nif (is_array(${1:x})) { }' },
      { name: 'inspect debug', text: 'print(inspect(${1:value}))' },
      { name: 'dir keys', text: 'print(dir(${1:obj}))' },
      { name: 'time elapsed', text: 'let t0 = time()\n$0\nprint("elapsed:", time() - t0)' },
      { name: 'random_int', text: 'let n = random_int(${1:1}, ${2:10})' },
      { name: 'random_choice', text: 'let x = random_choice(array(${1:1}, ${2:2}, ${3:3}))' },
      { name: 'cli_args', text: 'let args = cli_args()\nif (len(args) > 1) { print(args[1]) }' },
      { name: 'env_get', text: 'let val = env_get("${1:VAR_NAME}")' },
      { name: 'cwd/path_join', text: 'let base = cwd()\nlet path = path_join(base, "${1:file.txt}")' },
      { name: 'fileExists/listDir', text: 'if (fileExists("${1:path}")) { }\nlet files = listDir("${2:dir}")' },
      { name: 'create_dir', text: 'create_dir("${1:path}")' },
      { name: 'glob', text: 'let paths = glob("${1:*.spl}")' },
      { name: 'sleep', text: 'sleep(${1:1})' },
      { name: 'regex_match', text: 'let m = regex_match("${1:hello}", "${2:h.*o}")' },
      { name: 'regex_replace', text: 'let s = regex_replace("${1:a-b}", "-", "_")' },
      { name: 'base64_encode', text: 'let enc = base64_encode("${1:data}")' },
      { name: 'csv_parse', text: 'let rows = csv_parse("${1:a,b\\n1,2}")' },
      { name: 'uuid', text: 'let id = uuid()' },
      { name: 'hash_fnv', text: 'let h = hash_fnv("${1:string}")' },
      { name: 'import bits', text: 'import("lib/spl/bits.spl")\nprint(is_power_of_two(8), pop_count(7), next_power_of_two(5))' },
      { name: 'import pairs', text: 'import("lib/spl/pairs.spl")\nlet p = pair(1, "a")\nprint(fst(p), snd(p))' },
      { name: 'import color', text: 'import("lib/spl/color.spl")\nprint(red("error"), green("ok"), bold("title"))' },
      { name: 'import set_utils', text: 'import("lib/spl/set_utils.spl")\nlet s = set_from_array(array(1, 2, 2))\nprint(set_has(s, 1), set_size(s))' },
      { name: 'shuffle array', text: 'import("lib/spl/algo.spl")\nlet a = array(1, 2, 3, 4)\nprint(shuffle(a))' },
      { name: 'lerp', text: 'import("lib/spl/num_utils.spl")\nprint(lerp(0, 100, 0.5))' },
      { name: 'replace_all', text: 'import("lib/spl/string_utils.spl")\nprint(replace_all("${1:a-b-c}", "-", "_"))' },
      { name: 'flatten_one', text: 'import("lib/spl/list_utils.spl")\nprint(flatten_one(array(array(1,2), 3, array(4))))' },
      { name: 'group_by', text: 'import("lib/spl/list_utils.spl")\nlet groups = group_by(${1:arr}, lambda (x) => ${2:x})' },
      { name: 'merge_shallow', text: 'import("lib/spl/dict_utils.spl")\nlet m = merge_shallow({ "a": 1 }, { "b": 2 })' },
      { name: 'set_union/intersection', text: 'import("lib/spl/set_utils.spl")\nlet a = set_from_array(array(1, 2))\nlet b = set_from_array(array(2, 3))\nprint(set_union(a, b), set_intersection(a, b))' },
      { name: 'pair fst snd', text: 'import("lib/spl/pairs.spl")\nlet p = pair(${1:key}, ${2:value})\nprint(fst(p), snd(p))' },
      { name: 'triple', text: 'import("lib/spl/pairs.spl")\nlet t = triple(1, 2, 3)\nprint(first_of_triple(t), second_of_triple(t), third_of_triple(t))' },
      { name: 'ansi colors', text: 'import("lib/spl/color.spl")\nprint(ansi_red() + "red" + ansi_reset())' },
      { name: 'is_power_of_two', text: 'import("lib/spl/bits.spl")\nprint(is_power_of_two(8), next_power_of_two(5))' },
      { name: 'pop_count parity', text: 'import("lib/spl/bits.spl")\nprint(pop_count(7), parity(3))' },
      { name: 'unzip pairs', text: 'import("lib/spl/list_utils.spl")\nlet pairs = array(array(1,"a"), array(2,"b"))\nlet ab = unzip(pairs)\nprint(ab[0], ab[1])' },
      { name: 'values_list', text: 'import("lib/spl/dict_utils.spl")\nlet m = { "a": 1, "b": 2 }\nprint(values_list(m))' },
      { name: 'clamp_num', text: 'import("lib/spl/num_utils.spl")\nprint(clamp_num(${1:x}, ${2:0}, ${3:100}))' },
      { name: 'repeat_str', text: 'import("lib/spl/string_utils.spl")\nprint(repeat_str("${1:ab}", ${2:3}))' },
      { name: 'import cli_utils', text: 'import("lib/spl/cli_utils.spl")\nlet verbose = cli_flag("--verbose")\nlet cfg = cli_option("--config", "config.json")' },
      { name: 'import log_utils', text: 'import("lib/spl/log_utils.spl")\nlog_info_ts("starting")\nlog_struct("info", "event", { "x": 1 })' },
      { name: 'import mem_utils', text: 'import("lib/spl/mem_utils.spl")\nlet buf = alloc(32)\nwrite_u32(buf, 0, 42)\nprint(read_u32(buf, 0))\nfree(buf)' },
      { name: 'import date_utils', text: 'import("lib/spl/date_utils.spl")\nlet t0 = time()\n$0\nprint("elapsed:", elapsed_str(t0))' },
      { name: 'import graph_utils', text: 'import("lib/spl/graph_utils.spl")\nlet adj = {}\nadj_add_edge(adj, 1, 2)\nadj_add_edge(adj, 1, 3)\nbfs(adj, 1, lambda (n) => print(n))' },
      { name: 'import iter_utils', text: 'import("lib/spl/iter_utils.spl")\nprint(enumerate(array("a","b")), reversed_arr(array(1,2,3)))' },
      { name: 'import hex_utils', text: 'import("lib/spl/hex_utils.spl")\nprint(bytes_to_hex(array(72,101,108,108)), hex_to_bytes("48656c6c"))' },
      { name: 'cli_flag/option', text: 'import("lib/spl/cli_utils.spl")\nif (cli_flag("--help")) { print("Usage: ..."); return }\nlet path = cli_option("--out", "out.txt")' },
      { name: 'bfs_path', text: 'import("lib/spl/graph_utils.spl")\nlet path = bfs_path(adj, start, goal)\nif (path != null) print(path)' },
      { name: 'elapsed_str', text: 'import("lib/spl/date_utils.spl")\nlet t0 = time()\n$0\nprint(elapsed_str(t0))' },
      { name: 'sliding_window', text: 'import("lib/spl/iter_utils.spl")\nprint(sliding_window(array(1,2,3,4,5), 2))' },
      { name: 'import env_utils', text: 'import("lib/spl/env_utils.spl")\nlet port = env_get_int("PORT", 8080)\nlet debug = env_get_bool("DEBUG", false)' },
      { name: 'import path_utils', text: 'import("lib/spl/path_utils.spl")\nlet base_ext = path_split_ext("file.txt")\nprint(path_stem("a/b/c.spl"))' },
      { name: 'import sort_utils', text: 'import("lib/spl/sort_utils.spl")\nprint(argsort(array(30,10,20)), sort_by_key(arr, lambda (x) => x["name"]))' },
      { name: 'import str_buf', text: 'import("lib/spl/str_buf.spl")\nlet b = buf_new()\nbuf_add(b, "Hello")\nbuf_add_line(b, "world")\nprint(buf_build(b, ""))' },
      { name: 'partition', text: 'import("lib/spl/list_utils.spl")\nlet yes_no = partition(arr, lambda (x) => x > 0)\nprint(yes_no[0], yes_no[1])' },
      { name: 'find_index', text: 'import("lib/spl/list_utils.spl")\nlet i = find_index(arr, lambda (x) => x == ${1:value})' },
      { name: 'filter_keys map_values', text: 'import("lib/spl/dict_utils.spl")\nlet filtered = filter_keys(m, lambda (k) => len(k) > 1)\nlet mapped = map_values(m, lambda (v) => v * 2)' },
      { name: 'argsort', text: 'import("lib/spl/sort_utils.spl")\nlet order = argsort(array(3,1,2))\nprint(order)' },
      { name: 'path_stem', text: 'import("lib/spl/path_utils.spl")\nprint(path_stem("${1:path/file.spl}"))' },
    ];
    window.__splSnippetByName = function (n) { const s = SNIPPETS.find(function (x) { return x.name.toLowerCase() === n.toLowerCase(); }); return s ? s.text : null; };
    window.__splSnippetNames = SNIPPETS.map(function (s) { return s.name; });
    const snippetsList = document.getElementById('sidebar-snippets-list');
    if (snippetsList) {
      SNIPPETS.forEach((s) => {
        const it = document.createElement('div');
        it.className = 'snippet-item';
        it.textContent = s.name;
        it.title = s.text.replace(/\$\d+/g, '').slice(0, 50);
        it.addEventListener('click', () => {
          const model = editor.getModel();
          if (!model) return;
          const pos = editor.getPosition();
          if (!pos) return;
          const line = model.getLineContent(pos.lineNumber);
          const indent = line.match(/^\s*/)[0] || '';
          const inserted = s.text.replace(/\n/g, '\n' + indent);
          editor.executeEdits('snippet', [{ range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column }, text: inserted }]);
          editor.focus();
        });
        snippetsList.appendChild(it);
      });
    }
    const ctx = document.getElementById('sidebar-context-menu');
    document.getElementById('file-tree').addEventListener('contextmenu', (e) => {
      const item = e.target.closest('.tree-item');
      if (!item || !item.dataset.path) return;
      e.preventDefault();
      contextMenuPath = item.dataset.path;
      contextMenuIsDir = !!item.querySelector('.tree-children');
      ctx.querySelector('[data-cmd="open"]').disabled = contextMenuIsDir;
      ctx.querySelector('[data-cmd="new-file"]').disabled = !contextMenuIsDir;
      ctx.querySelector('[data-cmd="new-folder"]').disabled = !contextMenuIsDir;
      ctx.querySelector('[data-cmd="rename"]').disabled = false;
      ctx.querySelector('[data-cmd="delete"]').disabled = false;
      ctx.style.left = e.clientX + 'px';
      ctx.style.top = e.clientY + 'px';
      ctx.classList.remove('hidden');
    });
    document.addEventListener('click', () => ctx.classList.add('hidden'));
    ctx.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const cmd = btn.dataset.cmd;
        ctx.classList.add('hidden');
        if (cmd === 'open' && !contextMenuIsDir) openFile(contextMenuPath);
        else if (cmd === 'new-file' && contextMenuIsDir) {
          const name = prompt('File name:', 'main.spl');
          if (name) {
            const full = await window.splIde.path.join(contextMenuPath, name.trim());
            await window.splIde.fs.writeFile(full, '');
            await refreshFileTree();
            await openFile(full);
          }
        } else if (cmd === 'new-folder' && contextMenuIsDir) {
          const name = prompt('Folder name:', 'src');
          if (name) {
            const full = await window.splIde.path.join(contextMenuPath, name.trim());
            await window.splIde.fs.mkdir(full);
            await refreshFileTree();
          }
        } else if (cmd === 'rename') {
          const base = contextMenuPath.replace(/^.*[/\\]/, '');
          const newName = prompt('Rename to:', base);
          if (newName) {
            const parent = await window.splIde.path.dirname(contextMenuPath);
            const newPath = await window.splIde.path.join(parent, newName.trim());
            await window.splIde.fs.rename(contextMenuPath, newPath);
            if (openTabs.has(contextMenuPath)) await closeTab(contextMenuPath);
            await refreshFileTree();
            if (!contextMenuIsDir) await openFile(newPath);
          }
        } else if (cmd === 'delete') {
          if (!confirm('Delete ' + contextMenuPath + '?')) return;
          try {
            await window.splIde.fs.unlink(contextMenuPath);
          } catch {
            appendOutput('Cannot delete (folder or in use).\n');
            return;
          }
          if (openTabs.has(contextMenuPath)) await closeTab(contextMenuPath);
          await refreshFileTree();
        }
      });
    });
    renderOutline();
    scanTodo();
  }

  async function openFolder() {
    const dir = await window.splIde.dialog.openDirectory();
    if (!dir) return;
    projectRoot = dir;
    const pn = document.getElementById('project-name');
    if (pn) pn.textContent = (await window.splIde.path.basename(dir)) || dir;
    await refreshFileTree();
    buildProjectSymbolIndex();
  }

  async function openFileDialog() {
    const filePath = await window.splIde.dialog.openFile({ properties: ['openFile'], filters: [{ name: 'SPL', extensions: ['spl'] }, { name: 'All', extensions: ['*'] }] });
    if (filePath) {
      const dir = await window.splIde.path.dirname(filePath);
      if (!projectRoot) projectRoot = dir;
      await openFile(filePath);
      await refreshFileTree();
    }
  }

  async function refreshFileTree() {
    const container = document.getElementById('file-tree');
    container.innerHTML = '';
    if (!projectRoot) return;
    async function addEntries(parentEl, dir, depth) {
      let entries;
      try {
        entries = await window.splIde.fs.readdir(dir);
      } catch (err) {
        const msg = document.createElement('div');
        msg.className = 'tree-item';
        msg.style.color = 'var(--text-muted)';
        msg.textContent = '(Could not read folder)';
        parentEl.appendChild(msg);
        return;
      }
      const isDir = (e) => !!e.isDirectory;
      for (const e of entries.sort((a, b) => (isDir(a) === isDir(b) ? a.name.localeCompare(b.name) : isDir(a) ? -1 : 1))) {
        const full = await window.splIde.path.join(dir, e.name);
        if (e.name.startsWith('.') && e.name !== '.') continue;
        const item = document.createElement('div');
        item.className = 'tree-item depth-' + Math.min(depth, 3);
        item.dataset.path = full;
        item.innerHTML = '<span class="icon">' + (isDir(e) ? '📁' : '📄') + '</span><span class="name">' + escapeHtml(e.name) + '</span>';
        if (isDir(e)) {
          const sub = document.createElement('div');
          sub.className = 'tree-children';
          item.appendChild(sub);
          item.addEventListener('click', async (ev) => {
            ev.stopPropagation();
            item.classList.toggle('open');
            if (sub.innerHTML === '' && item.classList.contains('open')) await addEntries(sub, full, depth + 1);
          });
        } else {
          item.addEventListener('click', () => openFile(full));
        }
        parentEl.appendChild(item);
      }
    }
    await addEntries(container, projectRoot, 0);
  }

  async function openFile(filePath, contentOverride, dirtyOverride) {
    if (openTabs.has(filePath)) {
      await switchTab(filePath);
      return;
    }
    let content;
    if (contentOverride !== undefined && contentOverride !== null) {
      content = contentOverride;
    } else {
      try {
        content = await window.splIde.fs.readFile(filePath);
      } catch (err) {
        appendOutput('Could not open file: ' + err.message + '\n');
        return;
      }
    }
    const ext = await window.splIde.path.extname(filePath);
    const tab = document.createElement('div');
    tab.className = 'tab active';
    tab.dataset.path = filePath;
    tab.innerHTML = '<span class="name">' + escapeHtml(await window.splIde.path.basename(filePath)) + '</span><span class="close">×</span>';
    tab.querySelector('.name').addEventListener('click', () => switchTab(filePath));
    tab.querySelector('.close').addEventListener('click', (e) => { e.stopPropagation(); closeTab(filePath); });
    const tabsEl = document.getElementById('tabs');
    if (tabsEl) tabsEl.appendChild(tab);
    const dirty = dirtyOverride === true;
    openTabs.set(filePath, { tab, content, dirty });
    if (activeTabId) document.querySelector('.tab[data-path="' + selectorPath(activeTabId) + '"]')?.classList.remove('active');
    activeTabId = filePath;
    editor.setValue(content);
    monaco.editor.setModelLanguage(editor.getModel(), ext === '.spl' ? 'spl' : 'plaintext');
    updateTabDirty(filePath);
    updateStatusBar();
    updateWelcomeVisibility();
  }

  async function switchTab(filePath) {
    const cur = openTabs.get(activeTabId);
    if (cur) cur.content = editor.getValue();
    const next = openTabs.get(filePath);
    if (!next) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab[data-path="' + selectorPath(filePath) + '"]')?.classList.add('active');
    activeTabId = filePath;
    editor.setValue(next.content);
    const ext = await window.splIde.path.extname(filePath);
    monaco.editor.setModelLanguage(editor.getModel(), ext === '.spl' ? 'spl' : 'plaintext');
    updateStatusBar();
    renderOutline();
    scanTodo();
  }

  function setDirty(filePath, dirty) {
    const o = openTabs.get(filePath);
    if (!o) return;
    o.dirty = dirty;
    const tab = document.querySelector('.tab[data-path="' + selectorPath(filePath) + '"]');
    if (tab) tab.classList.toggle('dirty', dirty);
    if (filePath === activeTabId) updateStatusBar();
  }

  async function closeTab(filePath) {
    const o = openTabs.get(filePath);
    if (!o) return;
    closedTabs.push({ path: filePath, content: o.content || editor.getValue(), dirty: o.dirty });
    if (closedTabs.length > MAX_CLOSED_TABS) closedTabs.shift();
    openTabs.delete(filePath);
    o.tab.remove();
    if (activeTabId === filePath) {
      const next = openTabs.keys().next().value;
      if (next) await switchTab(next); else editor.setValue('');
      activeTabId = next || null;
    }
    updateStatusBar();
    updateWelcomeVisibility();
  }

  async function reopenClosedTab() {
    const last = closedTabs.pop();
    if (!last) return;
    await openFile(last.path, last.content, last.dirty);
  }

  async function closeOtherTabs() {
    const toClose = Array.from(openTabs.keys()).filter(function (p) { return p !== activeTabId; });
    for (let i = 0; i < toClose.length; i++) await closeTab(toClose[i]);
  }

  async function closeSavedTabs() {
    const toClose = Array.from(openTabs.keys()).filter(function (p) {
      const o = openTabs.get(p);
      return p !== activeTabId && o && !o.dirty;
    });
    for (let i = 0; i < toClose.length; i++) await closeTab(toClose[i]);
  }

  async function copyFilePath() {
    if (!activeTabId) return;
    try {
      await navigator.clipboard.writeText(activeTabId);
    } catch (_) {}
  }

  async function copyRelativePath() {
    if (!activeTabId || !projectRoot) return;
    try {
      let rel = activeTabId;
      if (rel.startsWith(projectRoot)) rel = rel.slice(projectRoot.length).replace(/^[/\\]/, '');
      await navigator.clipboard.writeText(rel);
    } catch (_) {}
  }

  async function revertFile() {
    if (!activeTabId) return;
    const o = openTabs.get(activeTabId);
    if (!o || !o.dirty) return;
    if (!confirm('Revert file? Unsaved changes will be lost.')) return;
    try {
      const content = await window.splIde.fs.readFile(activeTabId);
      editor.setValue(content);
      o.content = content;
      o.dirty = false;
      updateTabDirty(activeTabId);
      updateStatusBar();
    } catch (err) {
      appendOutput('Could not revert: ' + err.message + '\n');
    }
  }

  function toggleLineNumbers() {
    lineNumbersVisible = !lineNumbersVisible;
    if (editor) editor.updateOptions({ lineNumbers: lineNumbersVisible ? 'on' : 'off' });
    localStorage.setItem('spl-ide-lineNumbers', lineNumbersVisible ? 'on' : 'off');
  }

  function toggleRenderWhitespace() {
    if (renderWhitespace === 'selection') renderWhitespace = 'boundary';
    else if (renderWhitespace === 'boundary') renderWhitespace = 'all';
    else renderWhitespace = 'selection';
    if (editor) editor.updateOptions({ renderWhitespace: renderWhitespace });
    localStorage.setItem('spl-ide-renderWhitespace', renderWhitespace);
  }

  function sortLines(ascending) {
    const model = editor.getModel();
    if (!model) return;
    const sel = editor.getSelection();
    if (!sel) return;
    const startLn = sel.startLineNumber;
    const endLn = sel.endLineNumber;
    if (startLn === endLn && sel.startColumn === sel.endColumn) return;
    const lines = [];
    for (let i = startLn; i <= endLn; i++) lines.push(model.getLineContent(i));
    const sorted = lines.slice().sort(function (a, b) { return ascending !== false ? a.localeCompare(b) : b.localeCompare(a); });
    if (sorted.join('\n') === lines.join('\n')) return;
    const range = { startLineNumber: startLn, startColumn: 1, endLineNumber: endLn, endColumn: model.getLineMaxColumn(endLn) };
    editor.executeEdits('sort', [{ range: range, text: sorted.join('\n') }]);
    if (activeTabId) {
      const o = openTabs.get(activeTabId);
      if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); }
    }
  }

  async function closeTabsToRight() {
    const paths = Array.from(openTabs.keys());
    const idx = paths.indexOf(activeTabId);
    if (idx === -1) return;
    const toClose = paths.slice(idx + 1);
    for (let i = 0; i < toClose.length; i++) await closeTab(toClose[i]);
  }

  async function closeTabsToLeft() {
    const paths = Array.from(openTabs.keys());
    const idx = paths.indexOf(activeTabId);
    if (idx <= 0) return;
    const toClose = paths.slice(0, idx);
    for (let i = 0; i < toClose.length; i++) await closeTab(toClose[i]);
  }

  function focusEditor() {
    editor?.focus();
  }

  function removeDuplicateLines() {
    const model = editor.getModel();
    if (!model) return;
    const sel = editor.getSelection();
    if (!sel) return;
    const startLn = sel.startLineNumber;
    const endLn = sel.endLineNumber;
    const seen = new Set();
    const out = [];
    for (let i = startLn; i <= endLn; i++) {
      const line = model.getLineContent(i);
      if (seen.has(line)) continue;
      seen.add(line);
      out.push(line);
    }
    if (out.length === endLn - startLn + 1) return;
    const range = { startLineNumber: startLn, startColumn: 1, endLineNumber: endLn, endColumn: model.getLineMaxColumn(endLn) };
    editor.executeEdits('dedup', [{ range: range, text: out.join('\n') }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  function ensureTrailingNewline() {
    const model = editor.getModel();
    if (!model) return;
    const text = model.getValue();
    if (text === '' || text.endsWith('\n')) return;
    const end = model.getPositionAt(text.length);
    editor.executeEdits('trail', [{ range: { startLineNumber: end.lineNumber, startColumn: end.column, endLineNumber: end.lineNumber, endColumn: end.column }, text: '\n' }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  async function createSampleGameStateJson() {
    const dir = projectRoot || (activeTabId ? await window.splIde.path.dirname(activeTabId) : null);
    const targetDir = dir || (await window.splIde.dialog.openDirectory());
    if (!targetDir) return;
    const content = JSON.stringify({
      player: { x: 100, y: 200, w: 50, h: 80, health: 100 },
      enemies: [{ x: 300, y: 150, w: 40, h: 60, health: 50 }, { x: 450, y: 180, w: 40, h: 60, health: 50 }],
    }, null, 2);
    const filePath = await window.splIde.path.join(targetDir, 'game_state.json');
    try {
      await window.splIde.fs.writeFile(filePath, content);
      appendOutput('Created ' + filePath + '\n');
      if (projectRoot) refreshFileTree();
    } catch (e) {
      appendOutput('Failed: ' + e.message + '\n');
    }
    if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette();
  }

  async function createBrowserProject() {
    const dir = projectRoot || (await window.splIde.dialog.openDirectory());
    if (!dir) return;
    if (!projectRoot) {
      projectRoot = dir;
      const pn = document.getElementById('project-name');
      if (pn) pn.textContent = (await window.splIde.path.basename(dir)) || dir;
    }
    const mainSpl = '// Browser shell — main loop, viewport, history. Run: spl main.spl\nlet viewport = { "w": 800, "h": 600 }\nlet history = array()\nlet current_url = ""\n\ndef navigate(url) {\n\tpush(history, current_url)\n\tcurrent_url = url\n\tprint("Navigate: " + url)\n}\n\ndef main_loop() {\n\twhile (true) {\n\t\t// 1. Input  2. Fetch  3. Parse (HTML->DOM)  4. Layout  5. Paint\n\t\tbreak\n\t}\n}\n\nmain_loop()\n';
    const urlSpl = '// URL parser for browser\ndef parse_url(url) {\n\tlet parts = split(url, "://")\n\tlet scheme = ""\n\tlet rest = url\n\tif (len(parts) >= 2) { scheme = parts[0]; rest = parts[1] }\n\tlet qparts = split(rest, "?")\n\tlet path = rest\n\tlet query = ""\n\tif (len(qparts) >= 2) { path = qparts[0]; query = qparts[1] }\n\tlet segs = split(path, "/")\n\tlet host = len(segs) > 0 ? segs[0] : ""\n\treturn { "scheme": scheme, "host": host, "path": path, "query": query }\n}\n';
    const readme = '# Browser in SPL\n\nFetch → Parse → Layout → Paint.\n\n- main.spl: shell, viewport, history, main_loop\n- url.spl: parse_url()\n\nAdd: dom.spl (make_node, walk_dom), layout.spl (make_box), fetch for http when available.\n';
    try {
      await window.splIde.fs.writeFile(await window.splIde.path.join(dir, 'main.spl'), mainSpl);
      await window.splIde.fs.writeFile(await window.splIde.path.join(dir, 'url.spl'), urlSpl);
      await window.splIde.fs.writeFile(await window.splIde.path.join(dir, 'README-BROWSER.md'), readme);
      appendOutput('Created browser project in ' + dir + ' (main.spl, url.spl, README-BROWSER.md)\n');
      await refreshFileTree();
      await openFile(await window.splIde.path.join(dir, 'main.spl'));
    } catch (e) {
      appendOutput('Failed: ' + e.message + '\n');
    }
    if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette();
  }

  const FILE_TEMPLATES = [
    { name: 'Empty script', content: '' },
    { name: 'Hello world', content: 'print("Hello, SPL!")\n' },
    { name: 'Main entry', content: 'def main() {\n\tprint("Hello")\n}\n\nmain()\n' },
    { name: 'Test template', content: 'def test_example() {\n\tlet expected = 42\n\tlet result = 42\n\tassert (deep_equal(result, expected))\n}\n\ntest_example()\n' },
    { name: 'Read file', content: 'let content = read_file("input.txt")\nprint(content)\n' },
    { name: 'Game overlay', content: '// Game overlay: enable "Overlay" in toolbar, then Run. Reads game_state.json and draws boxes.\n// Create game_state.json with: {"player": {"x":100,"y":200,"w":50,"h":80,"health":100}, "enemies": [{"x":300,"y":150,"w":40,"h":60}]}\nlet path = "game_state.json"\nif (len(cli_args()) > 0) path = cli_args()[0]\nlet raw = read_file(path)\nlet state = json_parse(raw)\nprint("OVERLAY:clear")\nlet p = state["player"]\nif (p) {\n\tprint("OVERLAY:rect " + str(p["x"]) + " " + str(p["y"]) + " " + str(p["w"]) + " " + str(p["h"]) + " #00ff00")\n\tprint("OVERLAY:text " + str(p["x"]) + " " + str(p["y"] - 12) + " \\"HP " + str(p["health"]) + "\\" #ffffff")\n}\nlet enemies = state["enemies"]\nif (enemies) {\n\tfor i in range(0, len(enemies)) {\n\t\tlet e = enemies[i]\n\t\tprint("OVERLAY:rect " + str(e["x"]) + " " + str(e["y"]) + " " + str(e["w"]) + " " + str(e["h"]) + " #ff0000")\n\t}\n}\n' },
    { name: 'Game state reader', content: '// Read player coordinates and health from game_state.json (or path from cli_args).\n// Use with overlay or your own logic.\nlet path = "game_state.json"\nif (len(cli_args()) > 0) path = cli_args()[0]\nlet raw = read_file(path)\nlet state = json_parse(raw)\nlet player = state["player"]\nif (player) {\n\tlet x = player["x"]\n\tlet y = player["y"]\n\tlet health = player["health"]\n\tprint("Player at " + str(x) + ", " + str(y) + " HP: " + str(health))\n}\n' },
    { name: 'Browser shell', content: '// Browser shell: main loop, navigation, and render. Build your browser on SPL.\nlet viewport = { "w": 800, "h": 600 }\nlet history = array()\nlet current_url = ""\n\ndef navigate(url) {\n\tpush(history, current_url)\n\tcurrent_url = url\n\t// fetch(url) -> parse -> layout -> paint\n\tprint("Navigate: " + url)\n}\n\ndef main_loop() {\n\twhile (true) {\n\t\t// 1. Process input (keyboard, mouse)\n\t\t// 2. Fetch / resolve resource if needed\n\t\t// 3. Parse (HTML -> DOM)\n\t\t// 4. Layout (DOM -> boxes)\n\t\t// 5. Paint (boxes -> pixels)\n\t\t// 6. sleep(16)  // ~60fps\n\t\tbreak\n\t}\n}\n\nmain_loop()\n' },
    { name: 'HTTP fetch (browser)', content: '// Fetch URL body (use read_file for file:, or future http_get for http:).\ndef fetch_resource(url) {\n\tif (slice(url, 0, 7) == "file://") {\n\t\tlet path = slice(url, 7, len(url))\n\t\treturn read_file(path)\n\t}\n\t// http: -> http_get(url) when available\n\treturn ""\n}\n\nlet url = len(cli_args()) > 0 ? cli_args()[0] : "file://page.html"\nlet body = fetch_resource(url)\nprint("Body length: " + str(len(body)))\n' },
    { name: 'DOM node (browser)', content: '// DOM-like node for browser: tag, attributes, children.\ndef make_node(tag, attrs, children) {\n\treturn { "tag": tag, "attrs": attrs, "children": children }\n}\n\nlet doc = make_node("html", {}, array(\n\tmake_node("head", {}, array(make_node("title", {}, array()))),\n\tmake_node("body", {}, array(make_node("p", { "class": "hi" }, array())))\n))\n\ndef walk_dom(node, depth) {\n\tif (node == null) return\n\tprint(replace("  ", depth, "") + node["tag"])\n\tlet kids = node["children"]\n\tif (kids) { for i in range(0, len(kids)) { walk_dom(kids[i], depth + 1) } }\n}\nwalk_dom(doc, 0)\n' },
    { name: 'URL parser (browser)', content: '// Parse URL into scheme, host, path, query for browser.\ndef parse_url(url) {\n\tlet parts = split(url, "://")\n\tlet scheme = ""\n\tlet rest = url\n\tif (len(parts) >= 2) { scheme = parts[0]; rest = parts[1] }\n\tlet qparts = split(rest, "?")\n\tlet path = rest\n\tlet query = ""\n\tif (len(qparts) >= 2) { path = qparts[0]; query = qparts[1] }\n\tlet segs = split(path, "/")\n\tlet host = len(segs) > 0 ? segs[0] : ""\n\treturn { "scheme": scheme, "host": host, "path": path, "query": query }\n}\n\nlet u = parse_url("https://example.com/page?x=1")\nprint(inspect(u))\n' },
    { name: 'Layout box (browser)', content: '// Layout box for browser: position, size, children (flow/layout).\ndef make_box(x, y, w, h, children) {\n\treturn { "x": x, "y": y, "w": w, "h": h, "children": default(children, array()) }\n}\n\ndef layout_node(node, viewport_w, viewport_h) {\n\tif (node == null) return null\n\tlet box = make_box(0, 0, viewport_w, viewport_h, array())\n\t// Recursively layout children; apply CSS-like rules (block vs inline)\n\treturn box\n}\n\nlet root = make_box(0, 0, 800, 600, array())\nprint("Root box: " + str(root["w"]) + "x" + str(root["h"]))\n' },
    { name: 'Render loop (browser)', content: '// Simple render loop: layout then paint each frame. Plug in your layout_node(dom, w, h).\nlet viewport = { "w": 800, "h": 600 }\n\ndef paint(box) {\n\tif (box == null) return\n\t// draw_rect(box["x"], box["y"], box["w"], box["h"])\n\tlet kids = default(box["children"], array())\n\tfor i in range(0, len(kids)) { paint(kids[i]) }\n}\n\ndef render_frame(dom_root, layout_node) {\n\tlet layout_root = layout_node(dom_root, viewport["w"], viewport["h"])\n\tpaint(layout_root)\n}\n\n// In main_loop: render_frame(dom_root, layout_node) at ~60fps\n' },
    { name: 'Linked list', content: '// Singly linked list: node with value and next.\ndef node(value, next) { return { "value": value, "next": next } }\ndef list_prepend(head, value) { return node(value, head) }\ndef list_to_array(head) {\n\tlet out = array()\n\twhile (head != null) { push(out, head["value"]); head = head["next"] }\n\treturn out\n}\nlet head = node(1, node(2, node(3, null)))\nprint(inspect(list_to_array(head)))\n' },
    { name: 'Binary tree', content: '// Binary tree: value, left, right.\ndef tree(value, left, right) { return { "value": value, "left": left, "right": right }\n}\ndef tree_inorder(t) {\n\tif (t == null) return\n\ttree_inorder(t["left"])\n\tprint(t["value"])\n\ttree_inorder(t["right"])\n}\nlet root = tree(2, tree(1, null, null), tree(3, null, null))\ntree_inorder(root)\n' },
    { name: 'Stack', content: '// Stack: push/pop on array.\nlet stack = array()\ndef stack_push(s, x) { push(s, x) }\ndef stack_pop(s) { if (len(s) == 0) return null; return remove_at(s, len(s) - 1) }\ndef stack_peek(s) { if (len(s) == 0) return null; return s[len(s) - 1] }\nstack_push(stack, 10)\nstack_push(stack, 20)\nprint(stack_pop(stack))\nprint(stack_peek(stack))\n' },
    { name: 'Queue', content: '// Queue: enqueue at end, dequeue from front (shift).\nlet queue = array()\ndef queue_enqueue(q, x) { push(q, x) }\ndef queue_dequeue(q) { if (len(q) == 0) return null; return remove_at(q, 0) }\nqueue_enqueue(queue, "a")\nqueue_enqueue(queue, "b")\nprint(queue_dequeue(queue))\n' },
    { name: 'Binary search', content: '// Binary search in sorted array.\ndef binary_search(arr, key) {\n\tlet lo = 0\n\tlet hi = len(arr) - 1\n\twhile (lo <= hi) {\n\t\tlet mid = (lo + hi) / 2\n\t\tlet m = int(mid)\n\t\tif (arr[m] == key) return m\n\t\tif (arr[m] < key) lo = m + 1\n\t\telse hi = m - 1\n\t}\n\treturn -1\n}\nlet a = array(1, 3, 5, 7, 9)\nprint(binary_search(a, 5))\n' },
    { name: 'Quicksort', content: '// Quicksort (in-place style: partition and recurse).\ndef qsort(arr, lo, hi) {\n\tif (lo >= hi) return\n\tlet pivot = arr[hi]\n\tlet i = lo\n\tfor j in range(lo, hi) {\n\t\tif (arr[j] <= pivot) { let tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp; i = i + 1 }\n\t}\n\tlet tmp = arr[i]; arr[i] = arr[hi]; arr[hi] = tmp\n\tqsort(arr, lo, i - 1)\n\tqsort(arr, i + 1, hi)\n}\nlet a = array(3, 1, 4, 1, 5)\nqsort(a, 0, len(a) - 1)\nprint(inspect(a))\n' },
    { name: 'Recursive descent parser', content: '// Recursive descent: tokens + index; parse expr/term/factor.\nlet tokens = array()\nlet pos = 0\ndef peek() { if (pos >= len(tokens)) return null; return tokens[pos] }\ndef advance() { if (pos < len(tokens)) pos = pos + 1 }\ndef parse_expr() {\n\tlet left = parse_term()\n\twhile (peek() == "+" or peek() == "-") { let op = peek(); advance(); left = { "op": op, "left": left, "right": parse_term() } }\n\treturn left\n}\ndef parse_term() { return parse_factor() }\ndef parse_factor() { let t = peek(); advance(); return t }\n' },
    { name: 'Lexer (tokenizer)', content: '// Simple lexer: split into tokens (numbers, symbols, identifiers).\ndef lex(src) {\n\tlet tokens = array()\n\tlet i = 0\n\twhile (i < len(src)) {\n\t\tlet c = slice(src, i, i + 1)\n\t\tif (c == " " or c == "\\t") { i = i + 1; continue }\n\t\tif (c >= "0" and c <= "9") { let start = i; while (i < len(src) and slice(src, i, i + 1) >= "0" and slice(src, i, i + 1) <= "9") i = i + 1; push(tokens, slice(src, start, i)); continue }\n\t\tif (c == "+" or c == "-" or c == "*" or c == "/") { push(tokens, c); i = i + 1; continue }\n\t\ti = i + 1\n\t}\n\treturn tokens\n}\nprint(inspect(lex("1 + 23 * 4")))\n' },
    { name: 'AST node', content: '// AST node types for a small expression language.\ndef ast_num(n) { return { "kind": "num", "value": n } }\ndef ast_binop(op, left, right) { return { "kind": "binop", "op": op, "left": left, "right": right } }\ndef ast_eval(node) {\n\tif (node["kind"] == "num") return node["value"]\n\tlet l = ast_eval(node["left"])\n\tlet r = ast_eval(node["right"])\n\tif (node["op"] == "+") return l + r\n\tif (node["op"] == "-") return l - r\n\treturn 0\n}\nlet tree = ast_binop("+", ast_num(1), ast_binop("*", ast_num(2), ast_num(3)))\nprint(ast_eval(tree))\n' },
    { name: 'Bytecode VM stub', content: '// Minimal bytecode VM: PUSH, ADD, HALT; stack machine.\nlet OP_PUSH = 0\nlet OP_ADD = 1\nlet OP_HALT = 2\nlet code = array(OP_PUSH, 10, OP_PUSH, 32, OP_ADD, OP_HALT)\nlet stack = array()\nlet ip = 0\nwhile (ip < len(code)) {\n\tlet op = code[ip]\n\tip = ip + 1\n\tif (op == OP_PUSH) { push(stack, code[ip]); ip = ip + 1 }\n\telse if (op == OP_ADD) { let b = stack[len(stack)-1]; remove_at(stack, len(stack)-1); let a = stack[len(stack)-1]; remove_at(stack, len(stack)-1); push(stack, a + b) }\n\telse if (op == OP_HALT) break\n}\nprint(stack[len(stack)-1])\n' },
    { name: 'REPL loop', content: '// REPL: read line, eval, print. Use readline() if available.\nlet running = true\nwhile (running) {\n\tprint("> ")\n\t// let line = readline(); if line == "exit" { running = false }; else { print(eval(line)) }\n\trunning = false\n}\n' },
    { name: 'Config loader', content: '// Load config from JSON file; fallback defaults.\ndef load_config(path, defaults) {\n\ttry { let raw = read_file(path); return json_parse(raw) } catch (e) { return copy(defaults) }\n}\nlet defaults = { "host": "localhost", "port": 8080 }\nlet config = load_config("config.json", defaults)\nprint(config["host"])\n' },
  ];
  async function newFromTemplate() {
    if (!projectRoot) {
      const dir = await window.splIde.dialog.openDirectory();
      if (!dir) return;
      projectRoot = dir;
      const pn = document.getElementById('project-name');
      if (pn) pn.textContent = (await window.splIde.path.basename(dir)) || dir;
      await refreshFileTree();
    }
    const name = prompt('File name (e.g. main.spl):', 'main.spl') || 'main.spl';
    if (!name.trim()) return;
    const choice = prompt('Template: 1=Empty 2=Hello 3=Main 4=Test 5=Read 6=Game overlay 7=Game state 8=Browser 9=HTTP 10=DOM 11=URL 12=Layout 13=Render 14=Linked list 15=Binary tree 16=Stack 17=Queue 18=Binary search 19=Quicksort 20=Parser 21=Lexer 22=AST 23=VM 24=REPL 25=Config', '1') || '1';
    const idx = Math.max(0, Math.min(parseInt(choice, 10) - 1, FILE_TEMPLATES.length - 1));
    const template = FILE_TEMPLATES[idx];
    const filePath = await window.splIde.path.join(projectRoot, name.trim());
    try {
      await window.splIde.fs.writeFile(filePath, template.content);
    } catch (err) {
      appendOutput('Could not create file: ' + err.message + '\n');
      return;
    }
    await openFile(filePath);
    await refreshFileTree();
  }

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(editor.getValue());
    } catch (_) {}
  }

  let zenMode = false;
  function toggleZenMode() {
    zenMode = !zenMode;
    document.body.classList.toggle('zen-mode', zenMode);
  }

  function runSelection() {
    const sel = editor.getSelection();
    const model = editor.getModel();
    if (!model || !sel) return;
    const text = model.getValueInRange(sel).trim();
    if (!text) return;
    const replArea = document.getElementById('repl-area');
    const replInput = document.getElementById('repl-input');
    if (replArea && replArea.classList.contains('hidden')) {
      replArea.classList.remove('hidden');
      if (!replProcessId) toggleRepl();
    }
    if (replProcessId) {
      window.splIde.spawnWrite(replProcessId, text + '\n');
      const out = document.getElementById('repl-output');
      if (out) { out.textContent += '> ' + text + '\n'; out.scrollTop = out.scrollHeight; }
    } else if (replInput) {
      replInput.value = text;
      replInput.focus();
    }
  }

  function formatSelection() {
    const model = editor.getModel();
    if (!model) return;
    const sel = editor.getSelection();
    if (!sel) return;
    const startLn = sel.startLineNumber;
    const endLn = sel.endLineNumber;
    const lines = [];
    for (let i = startLn; i <= endLn; i++) lines.push(model.getLineContent(i));
    const trimmed = lines.map(function (l) { return l.replace(/\s+$/, ''); });
    let result = trimmed.join('\n').replace(/\n{3,}/g, '\n\n');
    const range = { startLineNumber: startLn, startColumn: 1, endLineNumber: endLn, endColumn: model.getLineMaxColumn(endLn) };
    editor.executeEdits('formatSel', [{ range: range, text: result }]);
    if (activeTabId) {
      const o = openTabs.get(activeTabId);
      if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); }
    }
  }

  function updateWelcomeVisibility() {
    const w = document.getElementById('welcome');
    if (w) w.classList.toggle('hidden', openTabs.size > 0);
  }

  async function saveCurrent() {
    if (!activeTabId) return null;
    const o = openTabs.get(activeTabId);
    if (!o || !o.dirty) return activeTabId;
    let text = editor.getValue();
    if (localStorage.getItem('spl-ide-formatOnSave') === 'true') {
      formatDocument();
      text = editor.getValue();
    }
    if (localStorage.getItem('spl-ide-trimTrailing') === 'true' && text) {
      const lines = text.split(/\r\n|\r|\n/);
      const trimmed = lines.map(function (line) { return line.replace(/\s+$/, ''); }).join('\n');
      if (trimmed !== text) {
        editor.setValue(trimmed);
        text = trimmed;
      }
    }
    await window.splIde.fs.writeFile(activeTabId, text);
    setDirty(activeTabId, false);
    if (projectRoot && activeTabId.endsWith('.spl')) buildProjectSymbolIndex();
    return activeTabId;
  }

  async function saveAll() {
    const dirtyPaths = Array.from(openTabs.keys()).filter(function (p) { const o = openTabs.get(p); return o && o.dirty; });
    const current = activeTabId;
    for (let i = 0; i < dirtyPaths.length; i++) {
      await switchTab(dirtyPaths[i]);
      await saveCurrent();
    }
    if (current && openTabs.has(current)) await switchTab(current);
  }

  async function nextTab() {
    const paths = Array.from(openTabs.keys());
    if (paths.length <= 1) return;
    const idx = paths.indexOf(activeTabId);
    const next = paths[(idx + 1) % paths.length];
    await switchTab(next);
  }

  async function prevTab() {
    const paths = Array.from(openTabs.keys());
    if (paths.length <= 1) return;
    const idx = paths.indexOf(activeTabId);
    const prev = paths[(idx - 1 + paths.length) % paths.length];
    await switchTab(prev);
  }

  function reverseLines() {
    const model = editor.getModel();
    if (!model) return;
    const sel = editor.getSelection();
    if (!sel) return;
    const startLn = sel.startLineNumber;
    const endLn = sel.endLineNumber;
    const lines = [];
    for (let i = startLn; i <= endLn; i++) lines.push(model.getLineContent(i));
    lines.reverse();
    const range = { startLineNumber: startLn, startColumn: 1, endLineNumber: endLn, endColumn: model.getLineMaxColumn(endLn) };
    editor.executeEdits('reverse', [{ range: range, text: lines.join('\n') }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  function insertDateTime(useDate) {
    const model = editor.getModel();
    const sel = editor.getSelection();
    if (!model || !sel) return;
    const d = new Date();
    const str = useDate ? d.toLocaleDateString() : d.toLocaleTimeString();
    editor.executeEdits('datetime', [{ range: sel, text: str }]);
  }

  let editorReadOnly = false;
  function toggleReadOnly() {
    editorReadOnly = !editorReadOnly;
    if (editor) editor.updateOptions({ readOnly: editorReadOnly });
  }

  async function showInFolder() {
    if (!activeTabId) return;
    try {
      const dir = await window.splIde.path.dirname(activeTabId);
      await window.splIde.shell.openPath(dir);
    } catch (_) {}
  }

  function titleCaseSelection() {
    const model = editor.getModel();
    if (!model) return;
    const sel = editor.getSelection();
    if (!sel) return;
    const text = model.getValueInRange(sel);
    const out = text.replace(/(^|\s)(\S)/g, function (_, pre, c) { return pre + c.toUpperCase(); });
    if (out === text) return;
    editor.executeEdits('titleCase', [{ range: sel, text: out }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  function trimLeadingWhitespace() {
    const model = editor.getModel();
    if (!model) return;
    const sel = editor.getSelection();
    if (!sel) return;
    const startLn = sel.startLineNumber;
    const endLn = sel.endLineNumber;
    const lines = [];
    for (let i = startLn; i <= endLn; i++) lines.push(model.getLineContent(i).replace(/^\s+/, ''));
    const range = { startLineNumber: startLn, startColumn: 1, endLineNumber: endLn, endColumn: model.getLineMaxColumn(endLn) };
    editor.executeEdits('trimLead', [{ range: range, text: lines.join('\n') }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  function addLineNumbersToSelection() {
    const model = editor.getModel();
    if (!model) return;
    const sel = editor.getSelection();
    if (!sel) return;
    const startLn = sel.startLineNumber;
    const endLn = sel.endLineNumber;
    const lines = [];
    for (let i = startLn; i <= endLn; i++) lines.push((i - startLn + 1) + '. ' + model.getLineContent(i));
    const range = { startLineNumber: startLn, startColumn: 1, endLineNumber: endLn, endColumn: model.getLineMaxColumn(endLn) };
    editor.executeEdits('lineNos', [{ range: range, text: lines.join('\n') }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  async function closeAllTabs() {
    const dirty = Array.from(openTabs.keys()).some(function (p) { const o = openTabs.get(p); return o && o.dirty; });
    if (dirty && !confirm('Some files are unsaved. Close all anyway?')) return;
    const paths = Array.from(openTabs.keys());
    for (let i = 0; i < paths.length; i++) await closeTab(paths[i]);
  }

  function printFile() {
    const text = editor ? editor.getValue() : '';
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write('<!DOCTYPE html><html><head><title>Print</title><style>body{font-family:monospace;white-space:pre-wrap;padding:16px;}</style></head><body>' + text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</body></html>');
    w.document.close();
    w.setTimeout(function () { w.print(); w.close(); }, 250);
  }

  function wrapSelectionWith(open, close) {
    const model = editor.getModel();
    if (!model) return;
    const sel = editor.getSelection();
    if (!sel) return;
    const text = model.getValueInRange(sel);
    editor.executeEdits('wrap', [{ range: sel, text: open + text + close }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  function sortLinesByLength() {
    const model = editor.getModel();
    if (!model) return;
    const sel = editor.getSelection();
    if (!sel) return;
    const startLn = sel.startLineNumber;
    const endLn = sel.endLineNumber;
    const lines = [];
    for (let i = startLn; i <= endLn; i++) lines.push(model.getLineContent(i));
    const sorted = lines.slice().sort(function (a, b) { return a.length - b.length; });
    if (sorted.join('\n') === lines.join('\n')) return;
    const range = { startLineNumber: startLn, startColumn: 1, endLineNumber: endLn, endColumn: model.getLineMaxColumn(endLn) };
    editor.executeEdits('sortLen', [{ range: range, text: sorted.join('\n') }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  function sortLines(ascending) {
    const model = editor.getModel();
    if (!model) return;
    const sel = editor.getSelection();
    if (!sel) return;
    const startLn = sel.startLineNumber;
    const endLn = sel.endLineNumber;
    const lines = [];
    for (let i = startLn; i <= endLn; i++) lines.push(model.getLineContent(i));
    const sorted = lines.slice().sort(function (a, b) {
      const c = a.localeCompare(b, undefined, { sensitivity: 'base' });
      return ascending ? c : -c;
    });
    const range = { startLineNumber: startLn, startColumn: 1, endLineNumber: endLn, endColumn: model.getLineMaxColumn(endLn) };
    editor.executeEdits('sortLines', [{ range: range, text: sorted.join('\n') }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  async function insertFilePath() {
    if (!activeTabId) return;
    const sel = editor.getSelection();
    if (!sel) return;
    editor.executeEdits('insertPath', [{ range: sel, text: activeTabId }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  async function insertFileName() {
    if (!activeTabId) return;
    const name = await window.splIde.path.basename(activeTabId);
    const sel = editor.getSelection();
    if (!sel) return;
    editor.executeEdits('insertName', [{ range: sel, text: name }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  let renderControlChars = false;
  function toggleControlCharacters() {
    renderControlChars = !renderControlChars;
    if (editor) editor.updateOptions({ renderControlCharacters: renderControlChars });
  }

  function convertTabsToSpaces() {
    const model = editor.getModel();
    if (!model) return;
    const tabSize = editorTabSize || 4;
    const sel = editor.getSelection();
    if (!sel) return;
    const startLn = sel.startLineNumber;
    const endLn = sel.endLineNumber;
    const lines = [];
    for (let i = startLn; i <= endLn; i++) {
      lines.push(model.getLineContent(i).replace(/\t/g, ' '.repeat(tabSize)));
    }
    const range = { startLineNumber: startLn, startColumn: 1, endLineNumber: endLn, endColumn: model.getLineMaxColumn(endLn) };
    editor.executeEdits('tabsToSpaces', [{ range: range, text: lines.join('\n') }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  function convertSpacesToTabs() {
    const model = editor.getModel();
    if (!model) return;
    const tabSize = editorTabSize || 4;
    const spaces = ' '.repeat(tabSize);
    const sel = editor.getSelection();
    if (!sel) return;
    const startLn = sel.startLineNumber;
    const endLn = sel.endLineNumber;
    const lines = [];
    for (let i = startLn; i <= endLn; i++) {
      let line = model.getLineContent(i);
      let result = '';
      let j = 0;
      while (j < line.length) {
        if (line.slice(j, j + tabSize) === spaces && line.slice(j, j + tabSize).trim() === '') {
          result += '\t';
          j += tabSize;
        } else {
          result += line[j];
          j++;
        }
      }
      lines.push(result);
    }
    const range = { startLineNumber: startLn, startColumn: 1, endLineNumber: endLn, endColumn: model.getLineMaxColumn(endLn) };
    editor.executeEdits('spacesToTabs', [{ range: range, text: lines.join('\n') }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  function removeLineNumberPrefix() {
    const model = editor.getModel();
    if (!model) return;
    const sel = editor.getSelection();
    if (!sel) return;
    const startLn = sel.startLineNumber;
    const endLn = sel.endLineNumber;
    const lines = [];
    const re = /^\s*\d+\.\s*/;
    for (let i = startLn; i <= endLn; i++) lines.push(model.getLineContent(i).replace(re, ''));
    const range = { startLineNumber: startLn, startColumn: 1, endLineNumber: endLn, endColumn: model.getLineMaxColumn(endLn) };
    editor.executeEdits('removeLineNos', [{ range: range, text: lines.join('\n') }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  function snakeCaseSelection() {
    const model = editor.getModel();
    if (!model) return;
    const sel = editor.getSelection();
    if (!sel) return;
    let text = model.getValueInRange(sel);
    text = text.trim().replace(/\s+/g, '_').replace(/([A-Z])/g, function (_, c) { return '_' + c.toLowerCase(); }).replace(/^_/, '').toLowerCase();
    editor.executeEdits('snake', [{ range: sel, text: text }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  function camelCaseSelection() {
    const model = editor.getModel();
    if (!model) return;
    const sel = editor.getSelection();
    if (!sel) return;
    let text = model.getValueInRange(sel);
    const parts = text.trim().split(/\s+/);
    const out = parts.map(function (p, i) {
      if (i === 0) return p.toLowerCase().replace(/(^|_)(.)/g, function (_, pre, c) { return c.toLowerCase(); });
      return (p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).replace(/_/g, '');
    }).join('');
    editor.executeEdits('camel', [{ range: sel, text: out }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  function trimAllWhitespace() {
    const model = editor.getModel();
    if (!model) return;
    const sel = editor.getSelection();
    if (!sel) return;
    const startLn = sel.startLineNumber;
    const endLn = sel.endLineNumber;
    const lines = [];
    for (let i = startLn; i <= endLn; i++) lines.push(model.getLineContent(i).trim());
    const range = { startLineNumber: startLn, startColumn: 1, endLineNumber: endLn, endColumn: model.getLineMaxColumn(endLn) };
    editor.executeEdits('trimAll', [{ range: range, text: lines.join('\n') }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  function focusProblems() {
    const panel = document.getElementById('panel');
    if (panel) panel.classList.remove('hidden');
    panelVisible = true;
    document.querySelector('.panel-tab[data-tab="problems"]')?.click();
    document.getElementById('sidebar')?.classList.remove('hidden');
    const sec = document.querySelector('.sidebar-section[data-section="problems"]');
    if (sec) sec.classList.add('open');
  }

  function focusOutline() {
    document.getElementById('sidebar')?.classList.remove('hidden');
    const sec = document.querySelector('.sidebar-section[data-section="outline"]');
    if (sec) { sec.classList.add('open'); sec.scrollIntoView({ block: 'nearest' }); }
  }

  let stickyScrollEnabled = false;
  function toggleStickyScroll() {
    stickyScrollEnabled = !stickyScrollEnabled;
    if (editor) editor.updateOptions({ stickyScroll: { enabled: stickyScrollEnabled } });
  }

  function insertSnippetByName() {
    const names = (typeof window.__splSnippetNames !== 'undefined' && window.__splSnippetNames) ? window.__splSnippetNames : [];
    const name = prompt('Snippet name (e.g. def, for range, main):', '');
    if (!name || !name.trim()) return;
    const text = typeof window.__splSnippetByName === 'function' && window.__splSnippetByName(name.trim());
    if (!text || !editor) return;
    const model = editor.getModel();
    const pos = editor.getPosition();
    if (!model || !pos) return;
    const line = model.getLineContent(pos.lineNumber);
    const indent = (line.match(/^\s*/) || [''])[0];
    const inserted = text.replace(/\n/g, '\n' + indent);
    editor.executeEdits('snippet', [{ range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column }, text: inserted }]);
    if (activeTabId) { const o = openTabs.get(activeTabId); if (o) { o.dirty = true; o.content = editor.getValue(); updateTabDirty(activeTabId); } }
  }

  async function saveAs() {
    const path = activeTabId ? await window.splIde.path.dirname(activeTabId) : (projectRoot || '');
    const newPath = await window.splIde.dialog.saveFile({ defaultPath: path, filters: [{ name: 'SPL', extensions: ['spl'] }, { name: 'All', extensions: ['*'] }] });
    if (!newPath) return;
    const content = editor.getValue();
    await window.splIde.fs.writeFile(newPath, content);
    const oldPath = activeTabId;
    const oldTab = openTabs.get(oldPath);
    if (oldTab) {
      openTabs.delete(oldPath);
      oldTab.tab.remove();
    }
    await openFile(newPath);
    updateStatusBar();
    updateWelcomeVisibility();
  }

  async function duplicateToNewFile() {
    if (!activeTabId) return;
    const content = editor.getValue();
    const base = await window.splIde.path.basename(activeTabId);
    const dir = await window.splIde.path.dirname(activeTabId);
    const defaultName = 'copy_of_' + base;
    const newPath = await window.splIde.dialog.saveFile({ defaultPath: await window.splIde.path.join(dir, defaultName), filters: [{ name: 'SPL', extensions: ['spl'] }, { name: 'All', extensions: ['*'] }] });
    if (!newPath) return;
    await window.splIde.fs.writeFile(newPath, content);
    await openFile(newPath);
    if (projectRoot) await refreshFileTree();
  }

  function revealInExplorer() {
    if (!activeTabId || !projectRoot) return;
    const container = document.getElementById('file-tree');
    if (!container) return;
    const items = container.querySelectorAll('.tree-item');
    let target = null;
    const norm = (p) => (p || '').replace(/\//g, '\\').toLowerCase();
    const want = norm(activeTabId);
    for (let i = 0; i < items.length; i++) {
      if (norm(items[i].dataset.path || '') === want) { target = items[i]; break; }
    }
    if (!target) return;
    let parent = target.parentElement;
    while (parent && parent !== container) {
      const folder = parent.previousElementSibling || parent.parentElement?.querySelector('.tree-item');
      if (folder && folder.classList && folder.classList.contains('tree-item')) folder.classList.add('open');
      if (parent.classList && parent.classList.contains('tree-item')) parent.classList.add('open');
      parent = parent.parentElement;
    }
    target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    target.classList.add('reveal-highlight');
    setTimeout(function () { target.classList.remove('reveal-highlight'); }, 2000);
  }

  async function formatDocument() {
    const model = editor.getModel();
    if (!model) return;
    const text = model.getValue();
    let result = text;
    if (window.splIde && typeof window.splIde.formatSource === 'function') {
      try {
        const res = await window.splIde.formatSource(text);
        if (res && res.ok && res.content !== undefined) result = res.content;
      } catch (_) { /* fall back to simple format */ }
    }
    if (result === text) {
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      const trimmed = lines.map(l => l.replace(/\s+$/, ''));
      result = trimmed.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '');
      if (result && !result.endsWith('\n')) result += '\n';
      if (result === text) return;
    }
    const fullRange = model.getFullModelRange();
    editor.executeEdits('format', [{ range: fullRange, text: result }]);
    if (activeTabId) {
      const o = openTabs.get(activeTabId);
      if (o) { o.dirty = true; o.content = result; updateTabDirty(activeTabId); }
    }
  }

  function trimTrailingWhitespace() {
    const model = editor.getModel();
    if (!model) return;
    const text = model.getValue();
    const eol = text.includes('\r\n') ? '\r\n' : (text.includes('\r') ? '\r' : '\n');
    const lines = text.split(/\r\n|\r|\n/);
    const trimmed = lines.map(function (l) { return l.replace(/\s+$/, ''); });
    const result = trimmed.join(eol);
    if (result === text) return;
    const fullRange = model.getFullModelRange();
    editor.executeEdits('trim', [{ range: fullRange, text: result }]);
    if (activeTabId) {
      const o = openTabs.get(activeTabId);
      if (o) { o.dirty = true; o.content = result; updateTabDirty(activeTabId); }
    }
  }

  async function runCurrentFile() {
    if (!activeTabId) { appendOutput('No file open. Open or create a file first.\n'); return; }
    await saveCurrent().catch(() => {});
    problems = [];
    renderProblems();
    if (runWithOverlay && window.splIde.overlayShow) { window.splIde.overlayShow(); window.splIde.overlayClear(); overlayShapes = []; overlayLineBuffer = ''; }
    try {
      const argsEl = document.getElementById('script-args');
      const scriptArgs = argsEl && argsEl.value ? argsEl.value.trim().split(/\s+/).filter(Boolean) : [];
      lastScriptArgs.length = 0; lastScriptArgs.push(...scriptArgs);
      const id = await window.splIde.runFile(activeTabId, projectRoot || await window.splIde.path.dirname(activeTabId), scriptArgs);
      runProcessId = id;
      const br = document.getElementById('btn-run'), bs = document.getElementById('btn-stop');
      if (br) br.classList.add('hidden'); if (bs) bs.classList.remove('hidden');
      appendOutput('$ Running ' + activeTabId + '\n');
      if (panelVisible) document.getElementById('panel').classList.remove('hidden');
      document.querySelectorAll('.panel-tab[data-tab]').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active'));
      document.querySelector('.panel-tab[data-tab="output"]').classList.add('active');
      document.getElementById('panel-output').classList.add('active');
    } catch (err) {
      appendOutput('Error: ' + err.message + '\n');
    }
  }

  async function runCurrent() {
    const source = editor.getValue();
    if (!source.trim()) {
      appendOutput('Nothing to run. Type some SPL code and press Run (F5).\n');
      return;
    }
    const cwd = projectRoot || (activeTabId ? await window.splIde.path.dirname(activeTabId) : '.');
    problems = [];
    renderProblems();
    if (runWithOverlay && window.splIde.overlayShow) { window.splIde.overlayShow(); window.splIde.overlayClear(); overlayShapes = []; overlayLineBuffer = ''; }
    try {
      const argsEl = document.getElementById('script-args');
      const scriptArgs = argsEl && argsEl.value ? argsEl.value.trim().split(/\s+/).filter(Boolean) : [];
      lastScriptArgs.length = 0; lastScriptArgs.push(...scriptArgs);
      const { id, promise } = await window.splIde.runSource(source, cwd, scriptArgs);
      runProcessId = id;
      const br = document.getElementById('btn-run'), bs = document.getElementById('btn-stop');
      if (br) br.classList.add('hidden'); if (bs) bs.classList.remove('hidden');
      appendOutput('$ Running current code (no save needed)...\n');
      promise.then(() => {
        runProcessId = null;
        if (bs) bs.classList.add('hidden'); if (br) br.classList.remove('hidden');
      }).catch((err) => {
        runProcessId = null;
        if (bs) bs.classList.add('hidden'); if (br) br.classList.remove('hidden');
        appendOutput('Error: ' + err.message + '\n');
      });
    } catch (err) {
      appendOutput('Error: could not run. ' + err.message + '\n');
      return;
    }
    if (panelVisible) document.getElementById('panel').classList.remove('hidden');
    document.querySelectorAll('.panel-tab[data-tab]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active'));
    document.querySelector('.panel-tab[data-tab="output"]').classList.add('active');
    document.getElementById('panel-output').classList.add('active');
  }

  function appendOutput(text) {
    const el = document.getElementById('terminal-output');
    if (!el) return;
    el.textContent += text;
    el.scrollTop = el.scrollHeight;
  }

  async function ensureTerminal() {
    if (terminalProcessId) return;
    const dir = projectRoot || (activeTabId ? await window.splIde.path.dirname(activeTabId) : null) || '.';
    try {
      const id = await window.splIde.spawnTerminal(dir);
      terminalProcessId = id;
      const el = document.getElementById('integrated-terminal-output');
      if (el) el.textContent = 'Terminal ready. Run: spl run program.spl  or  spl build  or any command.\n';
    } catch {
      const id = await window.splIde.spawnTerminal('.');
      terminalProcessId = id;
    }
  }
  (function initTerminalInput() {
    const input = document.getElementById('terminal-input');
    if (!input) return;
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const line = input.value;
      input.value = '';
      if (!line.trim()) return;
      const outEl = document.getElementById('integrated-terminal-output');
      if (outEl) outEl.textContent += '$ ' + line + '\n';
      if (terminalProcessId) window.splIde.spawnWrite(terminalProcessId, line + '\n');
      if (outEl) outEl.scrollTop = outEl.scrollHeight;
    });
  })();

  function openSearchModal() {
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('search-query');
    if (modal) modal.classList.remove('hidden');
    if (input) { input.value = ''; input.focus(); }
  }
  function closeSearchModal() {
    document.getElementById('search-modal')?.classList.add('hidden');
  }
  async function doSearch() {
    const input = document.getElementById('search-query');
    const query = input?.value?.trim();
    const useRegex = document.getElementById('search-use-regex')?.checked ?? false;
    const resultsEl = document.getElementById('search-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '<div class="problems-empty">Searching...</div>';
    if (!query) { resultsEl.innerHTML = '<div class="problems-empty">Enter a search term.</div>'; return; }
    const root = projectRoot || (activeTabId ? await window.splIde.path.dirname(activeTabId) : null);
    if (!root) { resultsEl.innerHTML = '<div class="problems-empty">Open a folder or file first.</div>'; return; }
    try {
      const results = await window.splIde.searchInFiles(root, query, useRegex);
      resultsEl.innerHTML = '';
      if (results.length === 0) { resultsEl.innerHTML = '<div class="problems-empty">No results.</div>'; return; }
      results.slice(0, 200).forEach((r) => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        const shortPath = r.path.replace(/\\/g, '/').split('/').pop();
        item.innerHTML = '<span class="path">' + escapeHtml(r.path) + '</span><span class="line">' + r.line + '</span><span class="text">' + escapeHtml(r.text) + '</span>';
        item.addEventListener('click', async () => {
          closeSearchModal();
          await openFile(r.path);
          editor.revealLine(r.line);
          editor.setPosition({ lineNumber: r.line, column: 1 });
          editor.focus();
        });
        resultsEl.appendChild(item);
      });
    } catch (err) {
      resultsEl.innerHTML = '<div class="problems-empty">Error: ' + escapeHtml(err.message) + '</div>';
    }
  }
  on('search-btn', 'click', doSearch);
  on('search-close', 'click', closeSearchModal);
  document.getElementById('search-query')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
    if (e.key === 'Escape') closeSearchModal();
  });

  let minimapEnabled = true;
  let wordWrapEnabled = false;
  function runEditorAction(actionId) {
    if (!editor) return;
    const a = editor.getAction ? editor.getAction(actionId) : null;
    if (a && a.run) a.run();
  }
  const COMMANDS = [
    { id: 'run', label: 'Run current buffer (F5)', shortcut: 'F5', run: () => runCurrent() },
    { id: 'run-file', label: 'Run file on disk', run: () => runCurrentFile() },
    { id: 'save', label: 'Save', shortcut: 'Ctrl+S', run: () => saveCurrent().catch(() => {}) },
    { id: 'format', label: 'Format document', run: () => formatDocument() },
    { id: 'theme', label: 'Toggle theme (dark / light / midnight)', run: () => toggleTheme() },
    { id: 'goto-line', label: 'Go to line...', shortcut: 'Ctrl+G', run: () => goToLine() },
    { id: 'trigger-suggest', label: 'Trigger IntelliSense (completion / docs)', shortcut: 'Ctrl+Space', run: () => { runEditorAction('editor.action.triggerSuggest'); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'goto-symbol', label: 'Go to Symbol in file', shortcut: 'Ctrl+Shift+O', run: () => { runEditorAction('editor.action.quickOutline'); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'search', label: 'Search in project', shortcut: 'Ctrl+Shift+F', run: () => openSearchModal() },
    { id: 'panel', label: 'Toggle output panel', run: () => togglePanel() },
    { id: 'focus-output-panel', label: 'Focus output panel', run: () => { if (!panelVisible) togglePanel(); document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active')); document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active')); document.querySelector('.panel-tab[data-tab="output"]')?.classList.add('active'); document.getElementById('panel-output')?.classList.add('active'); document.querySelector('.panel-tab[data-tab="output"]')?.focus(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'focus-problems-panel', label: 'Focus problems panel', run: () => { if (!panelVisible) togglePanel(); document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active')); document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active')); document.querySelector('.panel-tab[data-tab="problems"]')?.classList.add('active'); document.getElementById('panel-problems')?.classList.add('active'); document.querySelector('.panel-tab[data-tab="problems"]')?.focus(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'minimap', label: 'Toggle minimap', run: () => { minimapEnabled = !minimapEnabled; if (editor) editor.updateOptions({ minimap: { enabled: minimapEnabled } }); closeCommandPalette(); } },
    { id: 'fold-all', label: 'Fold all regions', run: () => { runEditorAction('editor.foldAll'); closeCommandPalette(); } },
    { id: 'unfold-all', label: 'Unfold all regions', run: () => { runEditorAction('editor.unfoldAll'); closeCommandPalette(); } },
    { id: 'goto-bracket', label: 'Go to matching bracket', run: () => { runEditorAction('editor.action.jumpToBracket'); closeCommandPalette(); } },
    { id: 'select-to-bracket', label: 'Select to matching bracket', run: () => { runEditorAction('editor.action.selectToBracket'); closeCommandPalette(); } },
    { id: 'shortcuts', label: 'Show keyboard shortcuts', run: () => { showShortcutsInDoc(); closeCommandPalette(); } },
    { id: 'zoom-in', label: 'Zoom in (increase font size)', run: () => { editorFontSize = Math.min(36, (editorFontSize || 14) + 2); if (editor) editor.updateOptions({ fontSize: editorFontSize }); localStorage.setItem('spl-ide-fontSize', String(editorFontSize)); closeCommandPalette(); } },
    { id: 'zoom-out', label: 'Zoom out (decrease font size)', run: () => { editorFontSize = Math.max(10, (editorFontSize || 14) - 2); if (editor) editor.updateOptions({ fontSize: editorFontSize }); localStorage.setItem('spl-ide-fontSize', String(editorFontSize)); closeCommandPalette(); } },
    { id: 'zoom-reset', label: 'Reset zoom (font size 14)', run: () => { editorFontSize = 14; if (editor) editor.updateOptions({ fontSize: 14 }); localStorage.setItem('spl-ide-fontSize', '14'); closeCommandPalette(); } },
    { id: 'comment-line', label: 'Toggle line comment', shortcut: 'Ctrl+/', run: () => runEditorAction('editor.action.commentLine') },
    { id: 'comment-block', label: 'Toggle block comment', shortcut: 'Ctrl+Shift+/', run: () => runEditorAction('editor.action.blockComment') },
    { id: 'word-wrap', label: 'Toggle word wrap', run: () => { wordWrapEnabled = !wordWrapEnabled; if (editor) editor.updateOptions({ wordWrap: wordWrapEnabled ? 'on' : 'off' }); closeCommandPalette(); } },
    { id: 'duplicate-line', label: 'Duplicate line', shortcut: 'Shift+Alt+Down', run: () => runEditorAction('editor.action.copyLinesDownAction') },
    { id: 'delete-line', label: 'Delete line', shortcut: 'Ctrl+Shift+K', run: () => runEditorAction('editor.action.deleteLines') },
    { id: 'move-line-up', label: 'Move line up', shortcut: 'Alt+Up', run: () => runEditorAction('editor.action.moveLinesUpAction') },
    { id: 'move-line-down', label: 'Move line down', shortcut: 'Alt+Down', run: () => runEditorAction('editor.action.moveLinesDownAction') },
    { id: 'indent-lines', label: 'Indent line(s)', shortcut: 'Ctrl+]', run: () => runEditorAction('editor.action.indentLines') },
    { id: 'outdent-lines', label: 'Outdent line(s)', shortcut: 'Ctrl+[', run: () => runEditorAction('editor.action.outdentLines') },
    { id: 'expand-selection', label: 'Expand selection', shortcut: 'Shift+Alt+Right', run: () => runEditorAction('editor.action.expandSelection') },
    { id: 'shrink-selection', label: 'Shrink selection', shortcut: 'Shift+Alt+Left', run: () => runEditorAction('editor.action.shrinkSelection') },
    { id: 'add-next-occurrence', label: 'Add selection to next find match', shortcut: 'Ctrl+D', run: () => runEditorAction('editor.action.addSelectionToNextFindMatch') },
    { id: 'select-all-occurrences', label: 'Select all occurrences', shortcut: 'Ctrl+Shift+L', run: () => runEditorAction('editor.action.selectHighlights') },
    { id: 'insert-line-below', label: 'Insert line below', shortcut: 'Ctrl+Enter', run: () => runEditorAction('editor.action.insertLineAfter') },
    { id: 'insert-line-above', label: 'Insert line above', shortcut: 'Ctrl+Shift+Enter', run: () => runEditorAction('editor.action.insertLineBefore') },
    { id: 'toggle-sidebar', label: 'Toggle sidebar', shortcut: 'Ctrl+B', run: () => { toggleSidebar(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'reopen-closed-tab', label: 'Reopen closed tab', shortcut: 'Ctrl+Shift+T', run: () => reopenClosedTab().then(() => { if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); }) },
    { id: 'find-in-file', label: 'Find in file', shortcut: 'Ctrl+F', run: () => runEditorAction('editor.action.startFindAction') },
    { id: 'replace-in-file', label: 'Replace in file', shortcut: 'Ctrl+H', run: () => runEditorAction('editor.action.startFindReplaceAction') },
    { id: 'transform-uppercase', label: 'Transform to uppercase', shortcut: 'Ctrl+Shift+U', run: () => runEditorAction('editor.action.transformToUppercase') },
    { id: 'transform-lowercase', label: 'Transform to lowercase', shortcut: 'Ctrl+Alt+U', run: () => runEditorAction('editor.action.transformToLowercase') },
    { id: 'join-lines', label: 'Join lines', shortcut: 'Ctrl+Alt+J', run: () => runEditorAction('editor.action.joinLines') },
    { id: 'insert-cursor-above', label: 'Insert cursor above', shortcut: 'Ctrl+Alt+Up', run: () => runEditorAction('editor.action.insertCursorAbove') },
    { id: 'insert-cursor-below', label: 'Insert cursor below', shortcut: 'Ctrl+Alt+Down', run: () => runEditorAction('editor.action.insertCursorBelow') },
    { id: 'close-other-tabs', label: 'Close other tabs', run: () => closeOtherTabs() },
    { id: 'close-saved-tabs', label: 'Close saved tabs', run: () => closeSavedTabs() },
    { id: 'copy-path', label: 'Copy file path', run: () => copyFilePath() },
    { id: 'copy-relative-path', label: 'Copy relative path', run: () => copyRelativePath() },
    { id: 'revert-file', label: 'Revert file', run: () => revertFile() },
    { id: 'toggle-line-numbers', label: 'Toggle line numbers', run: () => { toggleLineNumbers(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'toggle-whitespace', label: 'Toggle render whitespace', run: () => { toggleRenderWhitespace(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'sort-lines-asc', label: 'Sort lines ascending', run: () => sortLines(true) },
    { id: 'sort-lines-desc', label: 'Sort lines descending', run: () => sortLines(false) },
    { id: 'split-line', label: 'Split line', run: () => runEditorAction('editor.action.splitLine') },
    { id: 'close-tabs-right', label: 'Close tabs to the right', run: () => closeTabsToRight() },
    { id: 'close-tabs-left', label: 'Close tabs to the left', run: () => closeTabsToLeft() },
    { id: 'focus-editor', label: 'Focus editor', shortcut: 'Ctrl+1', run: () => focusEditor() },
    { id: 'scroll-line-up', label: 'Scroll line up', run: () => runEditorAction('editor.action.scrollLineUp') },
    { id: 'scroll-line-down', label: 'Scroll line down', run: () => runEditorAction('editor.action.scrollLineDown') },
    { id: 'center-line', label: 'Center line in view', run: () => { const p = editor?.getPosition(); if (p) editor.revealLineInCenter(p.lineNumber); } },
    { id: 'scroll-to-top', label: 'Scroll to top', run: () => { if (editor) { editor.revealLine(1); editor.setPosition({ lineNumber: 1, column: 1 }); editor.focus(); } if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'scroll-to-bottom', label: 'Scroll to bottom', run: () => { if (editor) { const model = editor.getModel(); const line = model ? model.getLineCount() : 1; editor.revealLine(line); editor.setPosition({ lineNumber: line, column: 1 }); editor.focus(); } if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'transpose-letters', label: 'Transpose letters', run: () => runEditorAction('editor.action.transposeLetters') },
    { id: 'remove-duplicate-lines', label: 'Remove duplicate lines', run: () => removeDuplicateLines() },
    { id: 'ensure-trailing-newline', label: 'Ensure single trailing newline', run: () => ensureTrailingNewline() },
    { id: 'new-from-template', label: 'New file from template', run: () => newFromTemplate() },
    { id: 'copy-content', label: 'Copy file content', run: () => copyContent() },
    { id: 'zen-mode', label: 'Zen mode (hide sidebar & panel)', run: () => { toggleZenMode(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'run-selection', label: 'Run selection in REPL', shortcut: 'F9', run: () => runSelection() },
    { id: 'format-selection', label: 'Format selection', run: () => formatSelection() },
    { id: 'go-to-bracket', label: 'Go to matching bracket', run: () => runEditorAction('editor.action.jumpToBracket') },
    { id: 'go-to-next-error', label: 'Go to next error / problem', shortcut: 'F8', run: () => goToNextProblem() },
    { id: 'go-to-prev-error', label: 'Go to previous error / problem', shortcut: 'Shift+F8', run: () => goToPreviousProblem() },
    { id: 'fold-all', label: 'Fold all', run: () => runEditorAction('editor.action.foldAll') },
    { id: 'unfold-all', label: 'Unfold all', run: () => runEditorAction('editor.action.unfoldAll') },
    { id: 'trim-whitespace', label: 'Trim trailing whitespace', run: () => trimTrailingWhitespace() },
    { id: 'duplicate-to-new-file', label: 'Duplicate to new file...', run: () => duplicateToNewFile() },
    { id: 'reveal-in-explorer', label: 'Reveal in explorer', run: () => revealInExplorer() },
    { id: 'keyboard-shortcuts', label: 'Keyboard shortcuts', run: () => { openKeyboardShortcuts(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'zoom-in', label: 'Zoom in', shortcut: 'Ctrl+=', run: () => { editorFontSize = Math.min(36, editorFontSize + 2); if (editor) editor.updateOptions({ fontSize: editorFontSize }); localStorage.setItem('spl-ide-fontSize', String(editorFontSize)); } },
    { id: 'zoom-out', label: 'Zoom out', shortcut: 'Ctrl+-', run: () => { editorFontSize = Math.max(10, editorFontSize - 2); if (editor) editor.updateOptions({ fontSize: editorFontSize }); localStorage.setItem('spl-ide-fontSize', String(editorFontSize)); } },
    { id: 'zoom-reset', label: 'Reset zoom', shortcut: 'Ctrl+0', run: () => { editorFontSize = 14; if (editor) editor.updateOptions({ fontSize: editorFontSize }); localStorage.setItem('spl-ide-fontSize', '14'); } },
    { id: 'save-all', label: 'Save all', run: () => saveAll().catch(err => appendOutput('Save error: ' + err.message + '\n')) },
    { id: 'save-as', label: 'Save as...', run: () => saveAs() },
    { id: 'next-tab', label: 'Next tab', shortcut: 'Ctrl+Tab', run: () => nextTab() },
    { id: 'prev-tab', label: 'Previous tab', shortcut: 'Ctrl+Shift+Tab', run: () => prevTab() },
    { id: 'select-line', label: 'Select line', shortcut: 'Ctrl+L', run: () => runEditorAction('editor.action.expandLineSelection') },
    { id: 'delete-word-left', label: 'Delete word left', run: () => runEditorAction('editor.action.deleteWordLeft') },
    { id: 'delete-word-right', label: 'Delete word right', run: () => runEditorAction('editor.action.deleteWordRight') },
    { id: 'copy-line-up', label: 'Copy line up', shortcut: 'Shift+Alt+Up', run: () => runEditorAction('editor.action.copyLinesUpAction') },
    { id: 'reverse-lines', label: 'Reverse lines', run: () => reverseLines() },
    { id: 'insert-date', label: 'Insert date', run: () => insertDateTime(true) },
    { id: 'insert-time', label: 'Insert time', run: () => insertDateTime(false) },
    { id: 'toggle-readonly', label: 'Toggle read-only', run: () => { toggleReadOnly(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'show-in-folder', label: 'Show in folder', run: () => showInFolder() },
    { id: 'scroll-page-up', label: 'Scroll page up', run: () => runEditorAction('editor.action.scrollPageUp') },
    { id: 'scroll-page-down', label: 'Scroll page down', run: () => runEditorAction('editor.action.scrollPageDown') },
    { id: 'title-case', label: 'Transform to title case', run: () => titleCaseSelection() },
    { id: 'trim-leading-whitespace', label: 'Trim leading whitespace', run: () => trimLeadingWhitespace() },
    { id: 'add-line-numbers', label: 'Add line numbers to selection', run: () => addLineNumbersToSelection() },
    { id: 'close-all-tabs', label: 'Close all tabs', run: () => closeAllTabs() },
    { id: 'print', label: 'Print', run: () => printFile() },
    { id: 'wrap-quotes', label: 'Wrap selection with double quotes', run: () => wrapSelectionWith('"', '"') },
    { id: 'wrap-parens', label: 'Wrap selection with parentheses', run: () => wrapSelectionWith('(', ')') },
    { id: 'wrap-brackets', label: 'Wrap selection with brackets', run: () => wrapSelectionWith('[', ']') },
    { id: 'wrap-braces', label: 'Wrap selection with braces', run: () => wrapSelectionWith('{', '}') },
    { id: 'sort-by-length', label: 'Sort lines by length', run: () => sortLinesByLength() },
    { id: 'sort-lines-asc', label: 'Sort lines ascending', run: () => sortLines(true) },
    { id: 'sort-lines-desc', label: 'Sort lines descending', run: () => sortLines(false) },
    { id: 'insert-file-path', label: 'Insert file path', run: () => insertFilePath() },
    { id: 'insert-file-name', label: 'Insert file name', run: () => insertFileName() },
    { id: 'toggle-control-chars', label: 'Toggle control characters', run: () => { toggleControlCharacters(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'tabs-to-spaces', label: 'Convert tabs to spaces', run: () => convertTabsToSpaces() },
    { id: 'spaces-to-tabs', label: 'Convert spaces to tabs', run: () => convertSpacesToTabs() },
    { id: 'remove-line-numbers', label: 'Remove line number prefixes', run: () => removeLineNumberPrefix() },
    { id: 'transform-snake-case', label: 'Transform to snake_case', run: () => snakeCaseSelection() },
    { id: 'transform-camel-case', label: 'Transform to camelCase', run: () => camelCaseSelection() },
    { id: 'trim-all-whitespace', label: 'Trim all whitespace (selection)', run: () => trimAllWhitespace() },
    { id: 'focus-problems', label: 'Focus problems', run: () => focusProblems() },
    { id: 'focus-outline', label: 'Focus outline', run: () => focusOutline() },
    { id: 'toggle-sticky-scroll', label: 'Toggle sticky scroll', run: () => { toggleStickyScroll(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'insert-snippet-by-name', label: 'Insert snippet by name', run: () => insertSnippetByName() },
    { id: 'settings', label: 'Settings', run: () => { openSettings(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'open-file', label: 'Open file...', run: () => openFileDialog() },
    { id: 'new-file', label: 'New file', run: () => newFile() },
    { id: 'view-ast', label: 'View AST (current buffer)', run: () => { document.querySelector('.panel-tab[data-tab="ast"]').click(); if (panelVisible) document.getElementById('panel').classList.remove('hidden'); } },
    { id: 'view-bytecode', label: 'View Bytecode (current buffer)', run: () => { document.querySelector('.panel-tab[data-tab="bytecode"]').click(); if (panelVisible) document.getElementById('panel').classList.remove('hidden'); } },
    // Theme (SPL IDE)
    { id: 'theme-dark', label: 'Set theme: Dark', run: () => { setThemeDark(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'theme-light', label: 'Set theme: Light', run: () => { setThemeLight(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'theme-midnight', label: 'Set theme: Midnight', run: () => { setThemeMidnight(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    // SPL-specific
    { id: 'run-with-last-args', label: 'Run with last script args', run: () => { const el = document.getElementById('script-args'); if (el) el.value = lastScriptArgs.join(' '); runCurrent(); } },
    { id: 'run-file-with-last-args', label: 'Run file with last script args', run: () => { const el = document.getElementById('script-args'); if (el) el.value = lastScriptArgs.join(' '); runCurrentFile(); } },
    { id: 'run-and-show-bytecode', label: 'Run then show bytecode', run: () => { runCurrent().then(() => { document.querySelector('.panel-tab[data-tab="bytecode"]')?.click(); if (!panelVisible) togglePanel(); }); } },
    { id: 'run-and-show-ast', label: 'Run then show AST', run: () => { runCurrent().then(() => { document.querySelector('.panel-tab[data-tab="ast"]')?.click(); if (!panelVisible) togglePanel(); }); } },
    { id: 'spl-version-output', label: 'Show SPL version in output', run: () => { (async () => { try { const v = await window.splIde?.splVersion?.(); appendOutput((v || 'SPL') + '\n'); } catch (_) { appendOutput('SPL (version unknown)\n'); } })(); if (!panelVisible) togglePanel(); document.querySelector('.panel-tab[data-tab="output"]')?.click(); } },
    { id: 'insert-spl-shebang', label: 'Insert SPL shebang line', run: () => { if (editor) { const model = editor.getModel(); const first = model.getLineContent(1); if (!/^#!/.test(first)) editor.executeEdits('', [{ range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, text: '#!/usr/bin/env spl\n' }]); } } },
    { id: 'list-spl-builtins', label: 'List SPL builtins (output)', run: () => { appendOutput('SPL builtins: ' + (typeof BUILTINS !== 'undefined' ? BUILTINS.join(', ') : '') + '\n'); if (!panelVisible) togglePanel(); document.querySelector('.panel-tab[data-tab="output"]')?.click(); } },
    { id: 'list-spl-modules', label: 'List SPL modules (output)', run: () => { appendOutput('SPL modules: ' + (typeof MODULES !== 'undefined' ? MODULES.join(', ') : '') + '\n'); if (!panelVisible) togglePanel(); document.querySelector('.panel-tab[data-tab="output"]')?.click(); } },
    { id: 'insert-import-math', label: 'Insert import math', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'import math\n' }); } },
    { id: 'insert-import-string', label: 'Insert import string', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'import string\n' }); } },
    { id: 'insert-import-json', label: 'Insert import json', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'import json\n' }); } },
    { id: 'insert-fstring', label: 'Insert f-string', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'f""' }); editor?.focus(); } },
    { id: 'insert-pipeline', label: 'Insert pipeline operator', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: ' |> ' }); } },
    { id: 'insert-comprehension', label: 'Insert list comprehension', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: '[ for x in : ]' }); } },
    // UI toggles
    { id: 'toggle-status-bar', label: 'Toggle status bar', run: () => { const sb = document.getElementById('status-bar'); if (sb) sb.classList.toggle('hidden'); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'toggle-tab-bar', label: 'Toggle tab bar', run: () => { const tb = document.getElementById('tabs'); if (tb) tb.classList.toggle('hidden'); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'focus-terminal-panel', label: 'Focus terminal panel', run: () => { if (!panelVisible) togglePanel(); document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active')); document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active')); document.querySelector('.panel-tab[data-tab="terminal"]')?.classList.add('active'); document.getElementById('panel-terminal')?.classList.add('active'); document.getElementById('terminal-input')?.focus(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'clear-terminal', label: 'Clear terminal output', run: () => { clearTerminal(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'spl-help-terminal', label: 'Run spl --help in terminal', run: () => { appendOutput('$ spl --help\n'); (async () => { try { const out = await window.splIde?.runCommand?.('spl --help'); appendOutput(out || ''); } catch (e) { appendOutput(String(e.message || e) + '\n'); } })(); if (!panelVisible) togglePanel(); document.querySelector('.panel-tab[data-tab="output"]')?.click(); } },
    { id: 'close-panel', label: 'Close panel', run: () => { if (panelVisible) togglePanel(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'toggle-doc-panel', label: 'Toggle doc panel', run: () => { document.getElementById('doc-panel')?.classList.toggle('hidden'); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'show-welcome', label: 'Show SPL welcome', run: () => { const w = document.getElementById('welcome'); if (w) w.classList.remove('hidden'); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'overlay-show', label: 'Show overlay window', run: () => { window.splIde.overlayShow(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'overlay-hide', label: 'Hide overlay window', run: () => { window.splIde.overlayHide(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'overlay-clear', label: 'Clear overlay drawing', run: () => { window.splIde.overlayClear(); overlayShapes = []; if (window.splIde.overlayDraw) window.splIde.overlayDraw([]); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'run-with-overlay', label: 'Run with overlay (then run script)', run: () => { runWithOverlay = true; const cb = document.getElementById('overlay-checkbox'); if (cb) cb.checked = true; runCurrent(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'create-game-state-json', label: 'Create sample game_state.json', run: () => createSampleGameStateJson() },
    { id: 'new-browser-project', label: 'New browser project (SPL)', run: () => createBrowserProject() },
    // Editor
    { id: 'increase-tab-size', label: 'Increase tab size', run: () => { editorTabSize = Math.min(8, (editorTabSize || 4) + 1); if (editor) editor.updateOptions({ tabSize: editorTabSize }); try { localStorage.setItem('spl-ide-tabSize', String(editorTabSize)); } catch (_) {} if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'decrease-tab-size', label: 'Decrease tab size', run: () => { editorTabSize = Math.max(2, (editorTabSize || 4) - 1); if (editor) editor.updateOptions({ tabSize: editorTabSize }); try { localStorage.setItem('spl-ide-tabSize', String(editorTabSize)); } catch (_) {} if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'toggle-indent-guides', label: 'Toggle indent guides', run: () => { const opts = editor?.getOptions(); const next = !(opts?.guides?.indentation); if (editor) editor.updateOptions({ guides: { ...opts?.guides, indentation: next, bracketPairs: opts?.guides?.bracketPairs !== false, highlightActiveBracketPair: opts?.guides?.highlightActiveBracketPair !== false } }); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'delete-to-line-end', label: 'Delete to line end', run: () => runEditorAction('editor.action.deleteAllRight') },
    { id: 'delete-to-line-start', label: 'Delete to line start', run: () => runEditorAction('editor.action.deleteAllLeft') },
    { id: 'select-to-line-start', label: 'Select to line start', run: () => runEditorAction('editor.action.expandLineSelection') },
    { id: 'select-to-line-end', label: 'Select to line end', run: () => runEditorAction('editor.action.selectEndOfLine') },
    { id: 'select-word', label: 'Select word', run: () => runEditorAction('editor.action.smartSelect.expand') },
    { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', run: () => runEditorAction('editor.action.undo') },
    { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Shift+Z', run: () => runEditorAction('editor.action.redo') },
    { id: 'select-all-editor', label: 'Select all', shortcut: 'Ctrl+A', run: () => runEditorAction('editor.action.selectAll') },
    // Sidebar
    { id: 'collapse-sidebar-sections', label: 'Collapse all sidebar sections', run: () => { document.querySelectorAll('.sidebar-section.open').forEach(s => s.classList.remove('open')); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'expand-sidebar-sections', label: 'Expand all sidebar sections', run: () => { document.querySelectorAll('.sidebar-section').forEach(s => s.classList.add('open')); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    // More SPL
    { id: 'focus-output-panel', label: 'Focus output panel', run: () => { if (!panelVisible) togglePanel(); document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active')); document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active')); document.querySelector('.panel-tab[data-tab="output"]')?.classList.add('active'); document.getElementById('panel-output')?.classList.add('active'); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'open-quick-open', label: 'Quick open file', shortcut: 'Ctrl+P', run: () => { openQuickOpen(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'open-command-palette', label: 'Open command palette', shortcut: 'Ctrl+Shift+P', run: () => { openCommandPalette(); } },
    { id: 'toggle-fullscreen', label: 'Toggle fullscreen', run: () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'convert-to-lf', label: 'Convert line endings to LF', run: () => { if (editor) { const m = editor.getModel(); if (m) { const t = m.getValue().replace(/\r\n/g, '\n').replace(/\r/g, '\n'); m.setValue(t); } } if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'convert-to-crlf', label: 'Convert line endings to CRLF', run: () => { if (editor) { const m = editor.getModel(); if (m) { const t = m.getValue().replace(/\r\n|\r|\n/g, '\r\n'); m.setValue(t); } } if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'wrap-single-quotes', label: 'Wrap selection with single quotes', run: () => wrapSelectionWith("'", "'") },
    { id: 'comment-line-block', label: 'Toggle block comment', run: () => runEditorAction('editor.action.blockComment') },
    { id: 'toggle-zen', label: 'Zen mode', run: () => { toggleZenMode(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'run-file-disk', label: 'Run file on disk', run: () => runCurrentFile() },
    { id: 'check-syntax', label: 'Check syntax (SPL --check)', run: () => { formatDocument(); } },
    { id: 'show-outline-only', label: 'Show outline only (collapse others)', run: () => { document.querySelectorAll('.sidebar-section').forEach(s => { s.classList.toggle('open', s.dataset.section === 'outline'); }); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'show-problems-only', label: 'Show problems only (collapse others)', run: () => { document.querySelectorAll('.sidebar-section').forEach(s => { s.classList.toggle('open', s.dataset.section === 'problems'); }); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'show-explorer-only', label: 'Show explorer only (collapse others)', run: () => { document.querySelectorAll('.sidebar-section').forEach(s => { s.classList.toggle('open', s.dataset.section === 'explorer'); }); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'insert-import-env', label: 'Insert import env', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'import env\n' }); } },
    { id: 'insert-import-random', label: 'Insert import random', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'import random\n' }); } },
    { id: 'insert-import-path', label: 'Insert import path', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'import path\n' }); } },
    { id: 'insert-import-sys', label: 'Insert import sys', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'import sys\n' }); } },
    { id: 'insert-import-fs', label: 'Insert import fs', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'import fs\n' }); } },
    { id: 'insert-import-memory', label: 'Insert import memory', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'import memory\n' }); } },
    { id: 'insert-import-time', label: 'Insert import time', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'import time\n' }); } },
    { id: 'insert-main', label: 'Insert main() template', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'def main() {\n\t\n}\n\nmain()' }); } },
    { id: 'insert-for-range', label: 'Insert for range loop', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'for i in range(0, 10) {\n\t\n}' }); } },
    { id: 'insert-while', label: 'Insert while loop', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'while () {\n\t\n}' }); } },
    { id: 'insert-try-catch', label: 'Insert try/catch', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'try {\n\t\n} catch (e) {\n\t\n}' }); } },
    { id: 'insert-print', label: 'Insert print()', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'print()' }); } },
    { id: 'insert-lambda', label: 'Insert lambda', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'lambda (x) => ' }); } },
    { id: 'insert-match', label: 'Insert match', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'match () {\n\tcase _: \n}' }); } },
    { id: 'insert-class', label: 'Insert class', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'class  {\n\tdef (self) {\n\t\t\n\t}\n}' }); } },
    { id: 'insert-assert', label: 'Insert assert', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'assert ()' }); } },
    { id: 'insert-defer', label: 'Insert defer', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'defer ' }); } },
    { id: 'insert-let', label: 'Insert let', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'let  = ' }); } },
    { id: 'insert-const', label: 'Insert const', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'const  = ' }); } },
    { id: 'insert-read-file', label: 'Insert read_file', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'read_file("")' }); } },
    { id: 'insert-write-file', label: 'Insert write_file', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'write_file("", )' }); } },
    { id: 'insert-time-bench', label: 'Insert time benchmark', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'let t0 = time()\n\nprint("elapsed:", time() - t0)' }); } },
    { id: 'insert-deep-equal', label: 'Insert deep_equal', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'deep_equal(, )' }); } },
    { id: 'insert-inspect', label: 'Insert inspect()', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'inspect()' }); } },
    { id: 'insert-cli-args', label: 'Insert cli_args()', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'cli_args()' }); } },
    { id: 'insert-json-parse', label: 'Insert json_parse', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'json_parse()' }); } },
    { id: 'insert-json-stringify', label: 'Insert json_stringify', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'json_stringify()' }); } },
    { id: 'insert-array-len', label: 'Insert array/len', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'array()\nlen()' }); } },
    { id: 'insert-map-filter-reduce', label: 'Insert map/filter/reduce', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: 'map(, )\nfilter(, )\nreduce(, , )' }); } },
    // More coding & IDE
    { id: 'fold-level-1', label: 'Fold level 1', run: () => { runEditorAction('editor.action.foldLevel1'); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'fold-level-2', label: 'Fold level 2', run: () => { runEditorAction('editor.action.foldLevel2'); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'fold-level-3', label: 'Fold level 3', run: () => { runEditorAction('editor.action.foldLevel3'); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'fold-level-4', label: 'Fold level 4', run: () => { runEditorAction('editor.action.foldLevel4'); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'fold-level-5', label: 'Fold level 5', run: () => { runEditorAction('editor.action.foldLevel5'); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'unfold-level-1', label: 'Unfold level 1', run: () => { runEditorAction('editor.action.unfoldLevel1'); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'clone-tab', label: 'Clone tab (duplicate in new tab)', run: async () => { if (!activeTabId || !window.splIde?.path) return; const dir = await window.splIde.path.dirname(activeTabId); const base = await window.splIde.path.basename(activeTabId); const copyName = base.replace(/(\.spl)?$/i, '') + ' (copy).spl'; const copyPath = await window.splIde.path.join(dir, copyName); await openFile(copyPath, editor.getValue(), true); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'toggle-font-ligatures', label: 'Toggle font ligatures', run: () => { const o = editor?.getOptions(); const next = !(o?.fontLigatures); if (editor) editor.updateOptions({ fontLigatures: next }); try { localStorage.setItem('spl-ide-fontLigatures', next ? 'on' : 'off'); } catch (_) {} if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'toggle-bracket-guides', label: 'Toggle bracket pair guides', run: () => { const o = editor?.getOptions(); const g = o?.guides || {}; const next = !g.bracketPairs; if (editor) editor.updateOptions({ guides: { ...g, bracketPairs: next } }); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'column-select', label: 'Column (block) select', run: () => runEditorAction('editor.action.columnSelect') },
    { id: 'insert-cursor-end-of-line', label: 'Add cursor to end of each selected line', run: () => runEditorAction('editor.action.insertCursorAtEndOfEachLineSelected') },
    { id: 'select-all-matches', label: 'Select all matches of current word', run: () => runEditorAction('editor.action.selectAllMatches') },
    { id: 'insert-timestamp', label: 'Insert timestamp', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: new Date().toISOString().slice(0, 19).replace('T', ' ') }); } },
    { id: 'sort-lines-natural', label: 'Sort lines (natural order)', run: () => { if (!editor) return; const m = editor.getModel(); const sel = editor.getSelection(); if (!m || !sel) return; const lines = []; for (let i = sel.startLineNumber; i <= sel.endLineNumber; i++) lines.push(m.getLineContent(i)); lines.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })); const text = lines.join('\n') + (sel.endLineNumber >= m.getLineCount() ? '' : '\n'); editor.executeEdits('', [{ range: { startLineNumber: sel.startLineNumber, startColumn: 1, endLineNumber: sel.endLineNumber, endColumn: m.getLineMaxColumn(sel.endLineNumber) }, text }]); } },
    { id: 'toggle-smooth-caret', label: 'Toggle smooth caret animation', run: () => { const o = editor?.getOptions(); const next = !(o?.cursorSmoothCaretAnimation === 'on'); if (editor) editor.updateOptions({ cursorSmoothCaretAnimation: next ? 'on' : 'off' }); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'toggle-rendered-whitespace', label: 'Cycle rendered whitespace (none/selection/boundary/all)', run: () => { renderWhitespace = renderWhitespace === 'all' ? 'selection' : (renderWhitespace === 'selection' ? 'boundary' : (renderWhitespace === 'boundary' ? 'none' : 'all')); if (editor) editor.updateOptions({ renderWhitespace: renderWhitespace }); try { localStorage.setItem('spl-ide-renderWhitespace', renderWhitespace); } catch (_) {} if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'show-doc-stats', label: 'Show document statistics', run: () => { const m = editor?.getModel(); if (!m) return; const text = m.getValue(); const lines = m.getLineCount(); const chars = text.length; const words = text.split(/\s+/).filter(Boolean).length; alert('Lines: ' + lines + '\nCharacters: ' + chars + '\nWords: ' + words); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'select-to-bracket', label: 'Select to matching bracket', run: () => runEditorAction('editor.action.selectToBracket') },
    { id: 'trigger-parameter-hints', label: 'Trigger parameter hints', shortcut: 'Ctrl+Shift+Space', run: () => runEditorAction('editor.action.triggerParameterHints') },
    { id: 'rename-symbol', label: 'Rename symbol', run: () => runEditorAction('editor.action.rename') },
    { id: 'quick-fix', label: 'Quick fix / code action', run: () => runEditorAction('editor.action.quickFix') },
    { id: 'refactor-extract', label: 'Refactor: extract', run: () => runEditorAction('editor.action.refactor') },
    { id: 'format-doc', label: 'Format document', run: () => formatDocument() },
    { id: 'toggle-suggest-preview', label: 'Toggle suggestion preview', run: () => { const o = editor?.getOptions(); const s = o?.suggest || {}; const next = !(s.preview === true); if (editor) editor.updateOptions({ suggest: { ...s, preview: next } }); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'toggle-occurrences-highlight', label: 'Toggle occurrences highlight', run: () => { const o = editor?.getOptions(); const next = !(o?.occurrencesHighlight === true); if (editor) editor.updateOptions({ occurrencesHighlight: next }); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'copy-with-syntax', label: 'Copy with syntax highlighting (plain text)', run: () => { try { navigator.clipboard.writeText(editor?.getModel()?.getValueInRange(editor.getSelection()) || ''); } catch (_) {} if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'insert-blank-line-above', label: 'Insert blank line above', run: () => runEditorAction('editor.action.insertLineBefore') },
    { id: 'insert-blank-line-below', label: 'Insert blank line below', run: () => runEditorAction('editor.action.insertLineAfter') },
    { id: 'delete-to-next-word', label: 'Delete to next word', run: () => runEditorAction('editor.action.deleteWordRight') },
    { id: 'delete-to-prev-word', label: 'Delete to previous word', run: () => runEditorAction('editor.action.deleteWordLeft') },
    { id: 'cursor-word-start-left', label: 'Move cursor to word start (left)', run: () => runEditorAction('editor.action.wordStartLeft') },
    { id: 'cursor-word-end-right', label: 'Move cursor to word end (right)', run: () => runEditorAction('editor.action.wordEndRight') },
    { id: 'select-to-word-start', label: 'Select to word start', run: () => runEditorAction('editor.action.wordStartLeftSelect') },
    { id: 'select-to-word-end', label: 'Select to word end', run: () => runEditorAction('editor.action.wordEndRightSelect') },
    { id: 'select-to-line-start', label: 'Select to line start', run: () => runEditorAction('editor.action.selectToLineStart') },
    { id: 'select-to-line-end', label: 'Select to line end', run: () => runEditorAction('editor.action.selectEndOfLineSelect') },
    { id: 'cursor-line-start', label: 'Go to line start', run: () => runEditorAction('editor.action.moveToLineStart') },
    { id: 'cursor-line-end', label: 'Go to line end', run: () => runEditorAction('editor.action.moveToLineEnd') },
    { id: 'scroll-to-cursor', label: 'Reveal cursor in center', run: () => { const p = editor?.getPosition(); if (p) editor.revealLineInCenter(p.lineNumber); } },
    { id: 'toggle-snippets-only', label: 'Show only snippets in completion', run: () => runEditorAction('editor.action.triggerSuggest') },
    { id: 'paste-and-indent', label: 'Paste and indent', run: () => runEditorAction('editor.action.paste') },
    { id: 'trim-final-newlines', label: 'Trim final newlines (keep one)', run: () => ensureTrailingNewline() },
    { id: 'toggle-readonly-editor', label: 'Toggle read-only (editor)', run: () => { toggleReadOnly(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'focus-snippets-sidebar', label: 'Focus Snippets in sidebar', run: () => { document.querySelectorAll('.sidebar-section').forEach(s => { s.classList.toggle('open', s.dataset.section === 'snippets'); }); document.querySelector('.sidebar-section[data-section="snippets"]')?.scrollIntoView(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'focus-search-sidebar', label: 'Focus Search in sidebar', run: () => { document.querySelectorAll('.sidebar-section').forEach(s => { s.classList.toggle('open', s.dataset.section === 'search'); }); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'focus-todo-sidebar', label: 'Focus TODO in sidebar', run: () => { document.querySelectorAll('.sidebar-section').forEach(s => { s.classList.toggle('open', s.dataset.section === 'todo'); }); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'close-editor-group', label: 'Close editor (current tab)', run: () => { if (activeTabId) closeTab(activeTabId); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'show-output-panel-only', label: 'Show only Output in panel', run: () => { if (!panelVisible) togglePanel(); document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active')); document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active')); document.querySelector('.panel-tab[data-tab="output"]')?.classList.add('active'); document.getElementById('panel-output')?.classList.add('active'); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'show-ast-panel-only', label: 'Show only AST in panel', run: () => { if (!panelVisible) togglePanel(); document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active')); document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active')); document.querySelector('.panel-tab[data-tab="ast"]')?.classList.add('active'); document.getElementById('panel-ast')?.classList.add('active'); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'show-bytecode-panel-only', label: 'Show only Bytecode in panel', run: () => { if (!panelVisible) togglePanel(); document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active')); document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active')); document.querySelector('.panel-tab[data-tab="bytecode"]')?.classList.add('active'); document.getElementById('panel-bytecode')?.classList.add('active'); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'clear-output-only', label: 'Clear output panel', run: () => { clearOutput(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'run-and-focus-output', label: 'Run and focus output', run: () => { runCurrent(); if (!panelVisible) togglePanel(); document.querySelector('.panel-tab[data-tab="output"]')?.click(); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'toggle-glyph-margin', label: 'Toggle glyph margin (line icons)', run: () => { const o = editor?.getOptions(); const next = !(o?.glyphMargin === true); if (editor) editor.updateOptions({ glyphMargin: next }); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'toggle-line-highlight', label: 'Toggle current line highlight', run: () => { const o = editor?.getOptions(); const next = o?.renderLineHighlight === 'none' ? 'line' : 'none'; if (editor) editor.updateOptions({ renderLineHighlight: next }); if (typeof window._closeCommandPalette === 'function') window._closeCommandPalette(); } },
    { id: 'insert-current-date', label: 'Insert current date', run: () => { if (editor) editor.trigger('keyboard', 'type', { text: new Date().toLocaleDateString() }); } },
    { id: 'wrap-backticks', label: 'Wrap selection in backticks', run: () => wrapSelectionWith('`', '`') },
    { id: 'wrap-single-quote', label: 'Wrap selection in single quotes', run: () => wrapSelectionWith("'", "'") },
  ];
  function openCommandPalette() {
    const modal = document.getElementById('command-palette');
    const input = document.getElementById('command-palette-input');
    const listEl = document.getElementById('command-palette-list');
    if (!modal || !input || !listEl) return;
    modal.classList.remove('hidden');
    input.value = '';
    input.focus();
    let selected = 0;
    let currentFiltered = [];
    function render(filter) {
      const q = (filter || '').toLowerCase().trim();
      currentFiltered = q ? COMMANDS.filter((c) => c.label.toLowerCase().includes(q)) : COMMANDS;
      listEl.innerHTML = '';
      selected = 0;
      currentFiltered.forEach((cmd, i) => {
        const div = document.createElement('div');
        div.className = 'command-palette-item' + (i === 0 ? ' selected' : '');
        div.dataset.index = String(i);
        div.innerHTML = '<span>' + escapeHtml(cmd.label) + '</span>' + (cmd.shortcut ? '<span class="shortcut">' + escapeHtml(cmd.shortcut) + '</span>' : '');
        div.addEventListener('click', () => { cmd.run(); closeCommandPalette(); });
        listEl.appendChild(div);
      });
    }
    render();
    function close() {
      modal.classList.add('hidden');
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onKey);
      modal.removeEventListener('click', onBackdrop);
    }
    function closeCommandPalette() { close(); editor?.focus(); }
    function onInput() {
      render(input.value);
      listEl.querySelectorAll('.command-palette-item').forEach((el, i) => el.classList.toggle('selected', i === 0));
      selected = 0;
    }
    function onKey(e) {
      const items = listEl.querySelectorAll('.command-palette-item');
      if (e.key === 'Escape') { closeCommandPalette(); e.preventDefault(); return; }
      if (e.key === 'ArrowDown') { selected = Math.min(selected + 1, items.length - 1); items.forEach((el, i) => el.classList.toggle('selected', i === selected)); e.preventDefault(); return; }
      if (e.key === 'ArrowUp') { selected = Math.max(selected - 1, 0); items.forEach((el, i) => el.classList.toggle('selected', i === selected)); e.preventDefault(); return; }
      if (e.key === 'Enter' && currentFiltered[selected]) {
        currentFiltered[selected].run();
        closeCommandPalette();
        e.preventDefault();
      }
    }
    function onBackdrop(ev) { if (ev.target === modal) closeCommandPalette(); }
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKey);
    modal.addEventListener('click', onBackdrop);
    window._closeCommandPalette = closeCommandPalette;
  }
  function openQuickOpen() {
    const modal = document.getElementById('quick-open-modal');
    const input = document.getElementById('quick-open-input');
    const listEl = document.getElementById('quick-open-list');
    if (!modal || !input || !listEl) return;
    modal.classList.remove('hidden');
    input.value = '';
    input.focus();
    const paths = Array.from(openTabs.keys());
    function render(filter) {
      const q = (filter || '').toLowerCase().trim();
      let items = paths.map((p) => ({ path: p, name: p.replace(/^.*[/\\]/, ''), isOpen: true }));
      if (q) items = items.filter((x) => x.name.toLowerCase().includes(q));
      const openFileItem = { path: null, name: 'Open file...', isOpen: false };
      listEl.innerHTML = '';
      [openFileItem, ...items.slice(0, 29)].forEach((x) => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.textContent = x.name;
        div.title = x.path || 'Open a file';
        div.addEventListener('click', async () => {
          modal.classList.add('hidden');
          if (x.isOpen) await switchTab(x.path);
          else await openFileDialog();
          editor?.focus();
        });
        listEl.appendChild(div);
      });
    }
    render();
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { modal.classList.add('hidden'); editor?.focus(); e.preventDefault(); }
      if (e.key === 'Enter') {
        const first = listEl.querySelector('.search-result-item');
        if (first) first.click();
        e.preventDefault();
      }
    });
    modal.addEventListener('click', (e) => { if (e.target === modal) { modal.classList.add('hidden'); editor?.focus(); } });
  }

  function toggleRepl() {
    const replArea = document.getElementById('repl-area');
    const panelOutput = document.getElementById('panel-output');
    const panelProblems = document.getElementById('panel-problems');
    if (replArea.classList.contains('hidden')) {
      replArea.classList.remove('hidden');
      panelOutput.classList.add('hidden');
      panelProblems.classList.add('hidden');
      if (replProcessId) return;
      window.splIde.getSplPath().then((splPath) => {
        const cwd = projectRoot || '.';
        const { id } = window.splIde.spawn(splPath, [], cwd);
        replProcessId = id;
        document.getElementById('repl-output').textContent = 'SPL REPL. Type SPL and press Enter. "exit" to quit.\n';
      }).catch((err) => {
        document.getElementById('repl-output').textContent = 'Error: could not start REPL (SPL not found). ' + err.message + '\n';
      });
    } else {
      replArea.classList.add('hidden');
      panelOutput.classList.remove('hidden');
      document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active'));
      document.querySelector('.panel-tab[data-tab="output"]').classList.add('active');
      panelOutput.classList.add('active');
      if (replProcessId) { window.splIde.spawnKill(replProcessId); replProcessId = null; }
    }
  }

  async function newFromTemplate() {
    if (!projectRoot) {
      const dir = await window.splIde.dialog.openDirectory();
      if (!dir) return;
      projectRoot = dir;
      const pn = document.getElementById('project-name');
      if (pn) pn.textContent = (await window.splIde.path.basename(dir)) || dir;
      await refreshFileTree();
    }
    const choice = prompt('Template:\n1) SPL script (main.spl)\n2) SPL CLI app (main.spl + README.md)\nEnter 1 or 2:', '1');
    if (!choice || !['1', '2'].includes(choice.trim())) return;
    const mainPath = await window.splIde.path.join(projectRoot, 'main.spl');
    const mainContent = choice.trim() === '2'
      ? '// SPL CLI app\nprint("Hello from SPL")\nlet args = cli_args()\nif (len(args) > 1) print("Args:", args)\n'
      : '// SPL script\nprint("Hello, SPL!")\n';
    await window.splIde.fs.writeFile(mainPath, mainContent);
    if (choice.trim() === '2') {
      const readmePath = await window.splIde.path.join(projectRoot, 'README.md');
      await window.splIde.fs.writeFile(readmePath, '# SPL CLI App\nRun: spl main.spl\n');
    }
    await refreshFileTree();
    await openFile(mainPath);
  }

  async function newFile() {
    if (!projectRoot) {
      const dir = await window.splIde.dialog.openDirectory();
      if (!dir) return;
      projectRoot = dir;
      const pn2 = document.getElementById('project-name');
      if (pn2) pn2.textContent = (await window.splIde.path.basename(dir)) || dir;
      await refreshFileTree();
    }
    const name = prompt('File name (e.g. main.spl):', 'main.spl') || 'main.spl';
    if (!name.trim()) return;
    const filePath = await window.splIde.path.join(projectRoot, name.trim());
    try {
      await window.splIde.fs.writeFile(filePath, '');
    } catch (err) {
      appendOutput('Could not create file: ' + err.message + '\n');
      return;
    }
    await refreshFileTree();
    await openFile(filePath);
  }

  async function newFolder() {
    if (!projectRoot) {
      appendOutput('Open a folder first (Open folder).\n');
      return;
    }
    const name = prompt('Folder name:', 'src') || 'src';
    if (!name.trim()) return;
    const dirPath = await window.splIde.path.join(projectRoot, name.trim());
    try {
      await window.splIde.fs.mkdir(dirPath);
    } catch (err) {
      appendOutput('Could not create folder: ' + err.message + '\n');
      return;
    }
    await refreshFileTree();
  }

  function showShortcutsInDoc() {
    const doc = document.getElementById('doc-content');
    const panel = document.getElementById('doc-panel');
    doc.innerHTML = `
<h3>Keyboard shortcuts</h3>
<table>
<tr><th>Shortcut</th><th>Action</th></tr>
<tr><td><kbd>F5</kbd></td><td>Run current buffer</td></tr>
<tr><td><kbd>Ctrl+S</kbd></td><td>Save</td></tr>
<tr><td><kbd>Ctrl+G</kbd></td><td>Go to line</td></tr>
<tr><td><kbd>Ctrl+F</kbd></td><td>Find</td></tr>
<tr><td><kbd>Ctrl+H</kbd></td><td>Replace</td></tr>
<tr><td><kbd>Ctrl+Shift+P</kbd></td><td>Command palette</td></tr>
<tr><td><kbd>Ctrl+P</kbd></td><td>Quick open file</td></tr>
<tr><td><kbd>Ctrl+Shift+O</kbd></td><td>Go to symbol in file</td></tr>
<tr><td><kbd>Ctrl+/</kbd></td><td>Toggle line comment</td></tr>
<tr><td><kbd>Ctrl+Shift+/</kbd></td><td>Toggle block comment</td></tr>
<tr><td><kbd>F8</kbd></td><td>Next problem</td></tr>
<tr><td><kbd>Shift+F8</kbd></td><td>Previous problem</td></tr>
<tr><td><kbd>Ctrl+D</kbd></td><td>Add selection to next match</td></tr>
<tr><td><kbd>Alt+Up/Down</kbd></td><td>Move line up/down</td></tr>
<tr><td><kbd>Ctrl+Enter</kbd></td><td>Insert line below</td></tr>
<tr><td><kbd>Ctrl+Shift+K</kbd></td><td>Delete line</td></tr>
</table>
<p>Use the command palette (<kbd>Ctrl+Shift+P</kbd>) for more actions (fold all, unfold all, theme, etc.).</p>
    `;
    if (panel) panel.classList.remove('hidden');
  }

  function loadDocPanel() {
    const doc = document.getElementById('doc-content');
    doc.innerHTML = `
<h3>Getting started</h3>
<p>SPL is a small language. Run code with <strong>F5</strong> or the Run button. Use <strong>Snippets</strong> in the sidebar to insert loops and functions.</p>
<p><code>print("Hello")</code> &nbsp; <code>let x = 42</code> &nbsp; <code>def add(a, b) { return a + b }</code></p>
<h3>Modules (import)</h3>
<p>Use <code>let m = import("module_name")</code> then <code>m.function_name()</code>. Type <code>import "</code> and use completion for module names.</p>
<h3>Stdlib reference</h3>
<table>
<tr><th>Module</th><th>Purpose &amp; key exports</th></tr>
<tr><td><code>math</code></td><td>sqrt, pow, sin, cos, tan, floor, ceil, round, abs, min, max, clamp, lerp, log, atan2, sign, deg_to_rad, rad_to_deg; <code>PI</code>, <code>E</code>, <code>TAU</code> (2π)</td></tr>
<tr><td><code>string</code></td><td>upper, lower, replace, join, split, trim, starts_with, ends_with, repeat, pad_left/right, split_lines, format, regex_match, regex_replace, chr, ord, hex, bin, hash_fnv</td></tr>
<tr><td><code>json</code></td><td>json_parse, json_stringify</td></tr>
<tr><td><code>random</code></td><td>random, random_int, random_choice, random_shuffle</td></tr>
<tr><td><code>sys</code></td><td>cli_args, print, panic, repr, spl_version, platform, os_name, arch; Error, ValueError, TypeError, stack_trace, env_get, cwd, chdir, hostname, cpu_count, getpid</td></tr>
<tr><td><code>io</code></td><td>read_file, write_file, readline, base64_encode/decode, csv_parse/stringify, fileExists, listDir, listDirRecursive, create_dir, is_file, is_dir, copy_file, delete_file, move_file, file_size, glob</td></tr>
<tr><td><code>array</code></td><td>array, len, push, push_front, slice, map, filter, reduce, reverse, find, sort, sort_by, flatten, flat_map, zip, chunk, unique, first, last, take, drop, cartesian, window, copy, deep_equal, insert_at, remove_at</td></tr>
<tr><td><code>map</code></td><td>keys, values, has, merge, deep_equal, copy</td></tr>
<tr><td><code>path</code></td><td>basename, dirname, path_join, cwd, chdir, realpath, temp_dir; plus file I/O (read_file, write_file, listDir, …)</td></tr>
<tr><td><code>env</code></td><td>env_get, env_all, env_set</td></tr>
<tr><td><code>types</code></td><td>str, int, float, parse_int, parse_float, is_nan, is_inf, is_string, is_array, is_map, is_number, is_function, type</td></tr>
<tr><td><code>time</code></td><td>time, sleep, time_format, monotonic_time</td></tr>
<tr><td><code>memory</code></td><td>alloc, free, alloc_zeroed, ptr_*, peek8–64, poke8–64, peek_float/double, mem_copy, mem_set, mem_cmp, mem_move, realloc, align_up/down, string_to_bytes, bytes_to_string; volatile_*, atomic_*, pool_*, struct_define, …</td></tr>
<tr><td><code>errors</code></td><td>Error, panic, error_message, error_name, error_cause, ValueError, TypeError, RuntimeError, OSError, KeyError, is_error_type</td></tr>
<tr><td><code>debug</code></td><td>inspect, type, dir, stack_trace, assert_eq</td></tr>
<tr><td><code>log</code></td><td>log_info, log_warn, log_error, log_debug</td></tr>
<tr><td><code>util</code></td><td>range, default, merge, all, any, vec2, vec3, rand_vec2, rand_vec3</td></tr>
<tr><td><code>profiling</code></td><td>profile_cycles, profile_fn</td></tr>
<tr><td><code>iter</code></td><td>range, map, filter, reduce, all, any, cartesian, window</td></tr>
<tr><td><code>collections</code></td><td>array, len, push, map, filter, reduce, keys, values, has, sort, slice, merge, deep_equal, …</td></tr>
<tr><td><code>fs</code></td><td>read_file, write_file, fileExists, listDir, listDirRecursive, create_dir, is_file, is_dir, copy_file, delete_file, move_file</td></tr>
<tr><td><code>process</code></td><td>list, find, open, close; read_u8/u16/u32/u64, read_float, read_double, read_bytes; write_u8/u32/float/bytes; scan, scan_bytes; ptr_add, ptr_sub, ptr_diff (Windows)</td></tr>
<tr><td><code>game</code></td><td>Window, draw, input, sound, game_loop (when built with game)</td></tr>
<tr><td><code>g2d</code></td><td>createWindow, fillRect, drawText, sprites, camera (when built with game)</td></tr>
<tr><td><code>regex</code></td><td>regex_match, regex_replace, escape_regex (Python <code>re</code>)</td></tr>
<tr><td><code>csv</code></td><td>csv_parse, csv_stringify</td></tr>
<tr><td><code>b64</code></td><td>base64_encode, base64_decode (Python <code>base64</code>)</td></tr>
<tr><td><code>logging</code></td><td>log_info, log_warn, log_error, log_debug</td></tr>
<tr><td><code>hash</code></td><td>hash_fnv (Python <code>hashlib</code>)</td></tr>
<tr><td><code>uuid</code></td><td>uuid</td></tr>
<tr><td><code>os</code></td><td>cwd, chdir, getpid, hostname, cpu_count, env_*, listDir, create_dir, is_file, is_dir, temp_dir, realpath</td></tr>
<tr><td><code>copy</code></td><td>copy, deep_equal</td></tr>
<tr><td><code>datetime</code></td><td>time, sleep, time_format, monotonic_time</td></tr>
<tr><td><code>secrets</code></td><td>random, random_int, random_choice, random_shuffle, uuid</td></tr>
<tr><td><code>itools</code></td><td>range, map, filter, reduce, all, any, cartesian, window (Python <code>itertools</code>)</td></tr>
<tr><td><code>cli</code></td><td>cli_args (Python <code>argparse</code>)</td></tr>
<tr><td><code>encoding</code></td><td>base64_encode, base64_decode, string_to_bytes, bytes_to_string</td></tr>
<tr><td><code>run</code></td><td>cli_args, exit_code</td></tr>
</table>
<p><strong>Python-inspired (SPL names):</strong> <code>re</code>→<code>regex</code>, <code>csv</code>→<code>csv</code>, <code>base64</code>→<code>b64</code>, <code>logging</code>→<code>logging</code>, <code>hashlib</code>→<code>hash</code>, <code>uuid</code>→<code>uuid</code>, <code>os</code>→<code>os</code>, <code>copy</code>→<code>copy</code>, <code>datetime</code>→<code>datetime</code>, <code>secrets</code>→<code>secrets</code>, <code>itertools</code>→<code>itools</code>, <code>argparse</code>→<code>cli</code>, plus <code>encoding</code>, <code>run</code>.</p>
<h3>Lib/SPL libraries (import by path)</h3>
<p>Run from project root so <code>lib/spl/...</code> resolves. One-liner: <code>import("lib/spl/prelude.spl")</code> pulls in algo, result, testing, string_utils, math_extra, funtools.</p>
<table>
<tr><th>Path</th><th>Exports</th></tr>
<tr><td><code>lib/spl/prelude.spl</code></td><td>Single import for algo + result + testing + string_utils + math_extra + funtools</td></tr>
<tr><td><code>lib/spl/algo.spl</code></td><td>binary_search, gcd, lcm, quicksort, merge_sort, sum_arr, product_arr, min_arr, max_arr, factorial, is_prime, clamp_val, fibonacci, is_palindrome, reverse_string, shuffle, lerp</td></tr>
<tr><td><code>lib/spl/result.spl</code></td><td>ok, err, is_ok, unwrap, unwrap_or; some, none, is_some, unwrap_opt, opt_or; map_result, map_opt</td></tr>
<tr><td><code>lib/spl/testing.spl</code></td><td>run_test, run_tests, assert_throws, assert_throws_msg, assert_true, assert_true_msg, assert_near, assert_near_eps, skip_test, test_suite (use builtin assert_eq for equality)</td></tr>
<tr><td><code>lib/spl/string_utils.spl</code></td><td>contains, lines, words, trim_each, count_sub, remove_prefix, remove_suffix, split_n, pad_center, is_empty, first_line, last_line, replace_all, repeat_str</td></tr>
<tr><td><code>lib/spl/math_extra.spl</code></td><td>factorial, sum_arr, product_arr, digits, is_even, is_odd, clamp_int</td></tr>
<tr><td><code>lib/spl/funtools.spl</code></td><td>partial, partial2, memoize, compose, compose3, once, pipe2, pipe3, tap, trace, trace_label</td></tr>
<tr><td><code>lib/spl/stats.spl</code></td><td>mean, median, variance, stdev, mode_single</td></tr>
<tr><td><code>lib/spl/textwrap.spl</code></td><td>wrap, shorten, fill</td></tr>
<tr><td><code>lib/spl/html.spl</code></td><td>escape, unescape, tag, tag_attr</td></tr>
<tr><td><code>lib/spl/counter.spl</code></td><td>count_elements, most_common, counter_get, counter_total, least_common, counter_elements</td></tr>
<tr><td><code>lib/spl/dict_utils.spl</code></td><td>get_default, set_default, invert, from_pairs, pick, omit, keys_sorted, merge_shallow, values_list, filter_keys, map_values</td></tr>
<tr><td><code>lib/spl/list_utils.spl</code></td><td>last_index_of, rotate_left, rotate_right, take_while, drop_while, intersperse, all_indexes, zip_with, flatten_one, unzip, group_by, partition, find_index, split_at</td></tr>
<tr><td><code>lib/spl/io_utils.spl</code></td><td>read_lines, write_lines, append_file, read_json_file, write_json_file</td></tr>
<tr><td><code>lib/spl/num_utils.spl</code></td><td>round_to_n, is_whole, sign_int, div_floor, div_ceil, between, in_range_excl, lerp, clamp_num</td></tr>
<tr><td><code>lib/spl/stack.spl</code></td><td>stack_new, stack_push, stack_pop, stack_peek, stack_empty, stack_size</td></tr>
<tr><td><code>lib/spl/queue.spl</code></td><td>queue_new, queue_enqueue, queue_dequeue, queue_peek, queue_empty, queue_size</td></tr>
<tr><td><code>lib/spl/table.spl</code></td><td>format_table, format_table_header</td></tr>
<tr><td><code>lib/spl/range_utils.spl</code></td><td>range_inclusive, range_step, range_reverse</td></tr>
<tr><td><code>lib/spl/bits.spl</code></td><td>is_power_of_two, next_power_of_two, parity, pop_count, mask_low, is_even, is_odd</td></tr>
<tr><td><code>lib/spl/pairs.spl</code></td><td>pair, fst, snd, swap_pair, map_fst, map_snd, triple, first_of_triple, second_of_triple, third_of_triple</td></tr>
<tr><td><code>lib/spl/color.spl</code></td><td>ansi_red, ansi_green, ansi_yellow, ansi_blue, ansi_reset, ansi_bold, red, green, yellow, bold, colorize</td></tr>
<tr><td><code>lib/spl/set_utils.spl</code></td><td>set_from_array, set_has, set_add, set_remove, set_union, set_intersection, set_difference, set_to_array, set_size, set_is_subset</td></tr>
<tr><td><code>lib/spl/cli_utils.spl</code></td><td>cli_flag, cli_option, cli_kv_map, cli_rest</td></tr>
<tr><td><code>lib/spl/log_utils.spl</code></td><td>log_info_ts, log_warn_ts, log_error_ts, log_debug_ts, log_struct</td></tr>
<tr><td><code>lib/spl/mem_utils.spl</code></td><td>read_u8, write_u8, read_u32, write_u32, read_bytes, write_bytes, copy_region, zero_region</td></tr>
<tr><td><code>lib/spl/date_utils.spl</code></td><td>now_iso, format_ts, elapsed_sec, elapsed_str, timestamp</td></tr>
<tr><td><code>lib/spl/graph_utils.spl</code></td><td>adj_add_edge, adj_neighbors, bfs, dfs, bfs_path</td></tr>
<tr><td><code>lib/spl/iter_utils.spl</code></td><td>enumerate, reversed_arr, cycle_take, repeat_value, sliding_window</td></tr>
<tr><td><code>lib/spl/hex_utils.spl</code></td><td>bytes_to_hex, hex_to_bytes</td></tr>
<tr><td><code>lib/spl/env_utils.spl</code></td><td>env_get_required, env_get_int, env_get_float, env_get_bool</td></tr>
<tr><td><code>lib/spl/path_utils.spl</code></td><td>path_split_ext, path_has_ext, path_stem, path_join_all</td></tr>
<tr><td><code>lib/spl/sort_utils.spl</code></td><td>argsort, sort_by_key, unique_sorted, sort_asc, sort_desc</td></tr>
<tr><td><code>lib/spl/str_buf.spl</code></td><td>buf_new, buf_add, buf_add_line, buf_build, buf_clear, buf_len</td></tr>
</table>
<p><strong>Pipeline</strong>: <code>x |> f</code> means <code>f(x)</code>. Chain: <code>value |> fn1 |> fn2</code>. Use <code>tap(print)</code> from funtools to inspect: <code>x |> tap(print) |> process</code>.</p>
<h3>Built-ins (global)</h3>
<table>
<tr><th>Function</th><th>Description</th></tr>
<tr><td><code>print(...)</code></td><td>Print to stdout</td></tr>
<tr><td><code>sqrt(x)</code>, <code>pow(x,y)</code>, <code>sin</code>, <code>cos</code>, <code>floor</code>, <code>ceil</code></td><td>Math</td></tr>
<tr><td><code>str(...)</code>, <code>int(x)</code>, <code>float(x)</code></td><td>Type conversion</td></tr>
<tr><td><code>array(...)</code>, <code>len(x)</code>, <code>range(a, b)</code></td><td>Collections</td></tr>
<tr><td><code>read_file(path)</code>, <code>write_file(path, content)</code></td><td>File I/O</td></tr>
<tr><td><code>json_parse(str)</code>, <code>json_stringify(value)</code></td><td>JSON</td></tr>
<tr><td><code>type(x)</code>, <code>dir(x)</code>, <code>inspect(x)</code></td><td>Reflection &amp; debug</td></tr>
</table>
<h3>Direct memory &amp; low-level (OS / systems)</h3>
<p>For OS and low-level code: pointers, raw memory, alignment, barriers.</p>
<table>
<tr><th>Function</th><th>Description</th></tr>
<tr><td><code>alloc(n)</code>, <code>free(ptr)</code></td><td>Raw heap: allocate <em>n</em> bytes; free pointer</td></tr>
<tr><td><code>ptr + n</code>, <code>ptr - n</code>, <code>ptr1 - ptr2</code></td><td>Pointer arithmetic (bytes)</td></tr>
<tr><td><code>ptr_offset(ptr, bytes)</code></td><td>Return ptr + offset (same as <code>ptr + bytes</code>)</td></tr>
<tr><td><code>ptr_address(ptr)</code>, <code>ptr_from_address(addr)</code></td><td>Pointer ↔ integer address (e.g. MMIO)</td></tr>
<tr><td><code>peek8(ptr)</code> … <code>peek64(ptr)</code></td><td>Read 8/16/32/64 bits at address</td></tr>
<tr><td><code>poke8(ptr, v)</code> … <code>poke64(ptr, v)</code></td><td>Write 8/16/32/64 bits at address</td></tr>
<tr><td><code>mem_copy(dest, src, n)</code>, <code>mem_set(ptr, byte, n)</code></td><td>Block copy and fill</td></tr>
<tr><td><code>align_up(value, align)</code>, <code>align_down(value, align)</code></td><td>Page/sector alignment</td></tr>
<tr><td><code>memory_barrier()</code>, <code>volatile_load8(ptr)</code>, <code>volatile_store8(ptr, v)</code></td><td>Ordering and volatile access</td></tr>
</table>
<p>Example: <code>let p = alloc(64)</code>; <code>poke32(p, 42)</code>; <code>print(peek32(p))</code>; <code>free(p)</code>. See <code>examples/low_level_memory.spl</code>.</p>
<h3>IDE overlay (draw on screen)</h3>
<p>Check <strong>Overlay</strong> in the toolbar, then Run. Any line your script prints that starts with <code>OVERLAY:</code> is drawn on a transparent fullscreen window (boxes, circles, text). Other output goes to the Output panel as usual.</p>
<table>
<tr><th>Command</th><th>Example</th></tr>
<tr><td><code>OVERLAY:clear</code></td><td>Clear all shapes</td></tr>
<tr><td><code>OVERLAY:rect x y w h [color]</code></td><td><code>print("OVERLAY:rect 100 200 50 80 #00ff00")</code> — green box</td></tr>
<tr><td><code>OVERLAY:circle x y r [color]</code></td><td><code>print("OVERLAY:circle 300 300 40 #ff0000")</code> — red circle</td></tr>
<tr><td><code>OVERLAY:line x1 y1 x2 y2 [color]</code></td><td>Draw a line</td></tr>
<tr><td><code>OVERLAY:text x y "label" [color]</code></td><td><code>print("OVERLAY:text 100 180 \\"HP 100\\" #ffffff")</code> — white text</td></tr>
</table>
<p>Use with <strong>game_state.json</strong>: put player/enemy positions (x, y, w, h, health) in a JSON file; read it with <code>read_file</code> + <code>json_parse</code>; print <code>OVERLAY:rect</code> / <code>OVERLAY:text</code> for each. Template: <em>New file from template → 6=Game overlay</em>. Command: <em>Create sample game_state.json</em>.</p>
<h3>Building a browser in SPL</h3>
<p>You can build a browser in SPL. Use <strong>New file from template</strong> and choose:</p>
<ul>
<li><strong>8=Browser shell</strong> — main loop, viewport, history, navigate().</li>
<li><strong>9=HTTP fetch</strong> — fetch_resource(url) for file:// (and http when available).</li>
<li><strong>10=DOM node</strong> — make_node(tag, attrs, children), walk_dom().</li>
<li><strong>11=URL parser</strong> — parse_url() → scheme, host, path, query.</li>
<li><strong>12=Layout box</strong> — make_box(x, y, w, h, children) for layout tree.</li>
<li><strong>13=Render loop</strong> — paint(box), render_frame(dom_root, layout_node).</li>
</ul>
<p>Pattern: <strong>fetch</strong> → <strong>parse</strong> (HTML/text → DOM) → <strong>layout</strong> (DOM → boxes) → <strong>paint</strong> (boxes → pixels). Use <code>read_file</code> for file:// URLs; add <code>http_get</code> when your runtime supports it. Snippets: type <code>browser:</code> for fetch_resource, make_node, walk_dom, viewport, history_push, paint_box, parse_url.</p>
<h3>Advanced SPL</h3>
<p><strong>Data structures</strong> (templates 14–17): Linked list (node + next), binary tree (value, left, right), stack (push/pop on array), queue (enqueue/dequeue). <strong>Algorithms</strong> (18–19): Binary search, quicksort. <strong>Parsing</strong> (20–22): Recursive descent (peek/advance, parse_expr), lexer (tokenize by spaces/numbers/symbols), AST (ast_num, ast_binop, ast_eval). <strong>VM</strong> (23): Bytecode interpreter (PUSH, ADD, HALT; stack machine). <strong>Patterns</strong>: Result type (ok/err), Option (some/none), iterator (make_iterator, next), memoize, curry, compose. Snippets: <code>algo:</code> binary search, gcd, BFS, DFS; <code>ds:</code> linked node, tree node; <code>parser:</code> peek/advance, expect; <code>vm:</code> opcode, dispatch.</p>
<p><strong>Performance</strong>: Use <code>copy</code> or <code>freeze</code> for immutable snapshots; avoid repeated <code>len(arr)</code> in hot loops by caching; use <code>slice</code> and <code>map</code>/<code>filter</code> for functional style; prefer <code>has(map, key)</code> before access. <strong>Conventions</strong>: Prefix internal helpers with <code>_</code>; return <code>null</code> or Result for fallible ops; use <code>deep_equal</code> in tests.</p>
<h3>Syntax</h3>
<p><code>let</code> / <code>const</code>, <code>def name() { }</code>, <code>if</code> / <code>elif</code> / <code>else</code>, <code>for x in range(a,b)</code> or <code>for x in arr</code>, <code>while</code>, <code>try</code> / <code>catch</code>, <code>match</code>, <code>nil</code>, <code>??</code> (null coalesce). <code>and</code> / <code>or</code> for logical operators.</p>
    `;
  }
})();
