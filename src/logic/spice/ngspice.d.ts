/**
 * ngspice WebAssembly Module Interface
 * Auto-generated for Emscripten MODULARIZE=1 + EXPORT_ES6=1 + EXPORT_ALL=1
 */

export interface NgspiceModuleOptions {
  noInitialRun?: boolean;
  stdin?: (() => number | null) | null;
  print?: ((text: string) => void) | null;
  printErr?: ((text: string) => void) | null;
  locateFile?: ((url: string, prefix: string) => string) | null;
  onRuntimeInitialized?: () => void;
  onAbort?: (reason: any) => void;
  [key: string]: any;
}

export interface NgspiceModule {
  // Runtime State & Lifecycle
  calledRun: boolean;
  noInitialRun: boolean;
  noExitRuntime: boolean;
  onRuntimeInitialized?: () => void;
  onAbort?: (reason: any) => void;
  ExitStatus: any;

  // I/O Hooks
  stdin: ((...args: any[]) => any) | null;
  print: ((text: string) => void) | null;
  printErr: ((text: string) => void) | null;
  locateFile: ((url: string, prefix: string) => string) | null;

  // Memory & Typed Arrays  HEAP8: Int8Array;
  HEAP16: Int16Array;
  HEAP32: Int32Array;
  HEAPU8: Uint8Array;
  HEAPU16: Uint16Array;
  HEAPU32: Uint32Array;
  HEAPF32: Float32Array;
  HEAPF64: Float64Array;
  HEAP64: BigInt64Array;
  HEAPU64: BigUint64Array;
  wasmMemory: WebAssembly.Memory;
  _malloc(size: number): number;
  _free(ptr: number): void;
  alignMemory(size: number): number;
  growMemory(size: number): boolean;
  getHeapMax(): number;

  // Stack & Pointer Utilities
  stackSave(): number;
  stackRestore(ptr: number): void;
  stackAlloc(size: number): number;
  getValue(ptr: number, type?: "i8"|"i16"|"i32"|"i64"|"float"|"double"|"*"): number | bigint;
  setValue(ptr: number, value: number | bigint, type?: "i8"|"i16"|"i32"|"i64"|"float"|"double"|"*"): void;
  wasmTable: WebAssembly.Table;
  getWasmTableEntry(idx: number): Function;

  // String Conversion
  UTF8ToString(ptr: number, maxBytesToRead?: number): string;
  UTF8ArrayToString(heap: Uint8Array, idx: number, maxBytesToRead?: number): string;
  lengthBytesUTF8(str: string): number;
  stringToUTF8(str: string, outPtr: number, maxBytesToWrite?: number): void;
  stringToUTF8Array(str: string, heap: Uint8Array, outIdx: number, maxBytesToWrite?: number): number;
  intArrayFromString(str: string): number[];

  // Filesystem & Environment
  FS: any;
  PATH: any;
  TTY: any;
  ENV: Record<string, string>;
  SYSCALLS: any;
  PIPEFS: any;
  MEMFS: any;
  PATH_FS: any;
  getExecutableName: () => string;

  // Runtime Callbacks
  addOnPostRun: (cb: () => void) => void;
  addOnPreRun: (cb: () => void) => void;
  onPostRuns: any[];
  onPreRuns: any[];  callRuntimeCallbacks: (queue: any[]) => void;
  keepRuntimeAlive: () => boolean;
  randomFill: (buf: Uint8Array) => void;
  base64Decode: (str: string) => Uint8Array;

  // Syscall & POSIX Wrappers (typed as number returns for TS safety)
  ___assert_fail: (cond: number, file: number, line: number, func: number) => void;
  ___cxa_throw: (ptr: number, type: number, destructor: number) => void;
  ___syscall_chdir: (path: number) => number;
  ___syscall_fcntl64: (fd: number, cmd: number, varargs: number) => number;
  ___syscall_fstat64: (fd: number, buf: number) => number;
  ___syscall_getcwd: (buf: number, size: number) => number;
  ___syscall_ioctl: (fd: number, req: number, varargs: number) => number;
  ___syscall_lstat64: (path: number, buf: number) => number;
  ___syscall_openat: (dirfd: number, path: number, flags: number, mode: number) => number;
  ___syscall_readlinkat: (dirfd: number, path: number, buf: number, bufsize: number) => number;
  ___syscall_stat64: (path: number, buf: number) => number;
  ___syscall_unlinkat: (dirfd: number, path: number, flags: number) => number;
  _fd_read: (fd: number, iov: number, iovcnt: number, pnum: number) => number;
  _fd_write: (fd: number, iov: number, iovcnt: number, pnum: number) => number;
  _fd_close: (fd: number) => number;
  _fd_seek: (fd: number, low: number, high: number, whence: number, pnew: number) => number;
  _main: (argc: number, argv: number) => number;
  _exit: (status: number) => void;
  _proc_exit: (code: number) => void;

  // Time & Memory Internals
  _emscripten_get_now: () => number;
  _emscripten_date_now: () => number;
  _emscripten_resize_heap: (requested_size: number) => boolean;
  _environ_get: (environ: number, buffer: number) => number;
  _environ_sizes_get: (pargc: number, pbufSize: number) => number;

  // Catch-all for EXPORT_ALL=1 (covers _ngSpice_* APIs and any future C exports)
  [key: string]: any;
}

/**
 * Factory function to instantiate the ngspice WebAssembly module.
 * @param options Configuration options for the module
 * @returns Promise resolving to the initialized NgspiceModule
 */
export default function createNgspiceModule(options?: NgspiceModuleOptions): Promise<NgspiceModule>;
