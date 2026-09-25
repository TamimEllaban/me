type LegacyCustomEventInit = {
  bubbles?: boolean;
  cancelable?: boolean;
  detail?: unknown;
};

type LegacyStreamController = {
  enqueue: (chunk: unknown) => void;
  close: () => void;
  error: (reason?: unknown) => void;
};

type LegacyReadableStreamInit = {
  start?: (controller: LegacyStreamController) => void | Promise<void>;
  cancel?: (reason?: unknown) => void | Promise<void>;
};

type LegacyReadableStreamReader = {
  read: () => Promise<{ done: boolean; value?: unknown }>;
  releaseLock: () => void;
  cancel?: (reason?: unknown) => Promise<void>;
};

type LegacyTextDecoderOptions = {
  fatal?: boolean;
};

type LegacyTextDecodeOptions = {
  stream?: boolean;
};

type LegacyTextEncoder = {
  encode: (input?: string) => Uint8Array;
};

type LegacyTextDecoder = {
  decode: (input?: ArrayBuffer | ArrayBufferView, options?: LegacyTextDecodeOptions) => string;
};

type LegacyReadableStream = {
  getReader: () => LegacyReadableStreamReader;
};

type LegacyWindow = Window & {
  CustomEvent?: typeof CustomEvent;
  TextEncoder?: typeof TextEncoder;
  TextDecoder?: typeof TextDecoder;
  ReadableStream?: typeof ReadableStream;
};

export function installLegacyCustomEvent() {
  const legacyWindow = window as LegacyWindow;
  if (typeof legacyWindow.CustomEvent === "function") return;

  const LegacyCustomEvent = function (this: Event, type: string, init: LegacyCustomEventInit = {}) {
    const event = document.createEvent("CustomEvent");
    event.initCustomEvent(type, Boolean(init.bubbles), Boolean(init.cancelable), init.detail);
    return event;
  } as unknown as typeof CustomEvent;

  legacyWindow.CustomEvent = LegacyCustomEvent;
}

function appendCodePoint(output: string[], codePoint: number) {
  if (codePoint <= 0xffff) {
    output.push(String.fromCharCode(codePoint));
    return;
  }
  const value = codePoint - 0x10000;
  output.push(String.fromCharCode(0xd800 + (value >> 10), 0xdc00 + (value & 0x3ff)));
}

function utf8Bytes(input: string) {
  const text = String(input == null ? "" : input);
  const bytes: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    let codePoint = text.charCodeAt(index);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && index + 1 < text.length) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      }
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return bytes;
}

function toBytes(input?: ArrayBuffer | ArrayBufferView) {
  if (input == null) return new Uint8Array(0);
  if (input instanceof Uint8Array) return input;
  if (typeof ArrayBuffer !== "undefined" && input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer as ArrayBuffer, input.byteOffset, input.byteLength);
  }
  return new Uint8Array(0);
}

function decodeUtf8(bytes: Uint8Array, start: number, fatal: boolean) {
  const output: string[] = [];
  let index = start;
  while (index < bytes.length) {
    const first = bytes[index]!;
    let codePoint = 0;
    let length = 0;
    if (first <= 0x7f) {
      codePoint = first;
      length = 1;
    } else if (first >= 0xc2 && first <= 0xdf) {
      codePoint = first & 0x1f;
      length = 2;
    } else if (first >= 0xe0 && first <= 0xef) {
      codePoint = first & 0x0f;
      length = 3;
    } else if (first >= 0xf0 && first <= 0xf4) {
      codePoint = first & 0x07;
      length = 4;
    } else {
      if (fatal) throw new Error("Invalid UTF-8");
      output.push("�");
      index += 1;
      continue;
    }

    if (index + length > bytes.length) {
      if (fatal) throw new Error("Invalid UTF-8");
      break;
    }

    let valid = true;
    for (let offset = 1; offset < length; offset += 1) {
      const next = bytes[index + offset]!;
      if ((next & 0xc0) !== 0x80) {
        valid = false;
        break;
      }
      codePoint = (codePoint << 6) | (next & 0x3f);
    }
    if (!valid || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
      if (fatal) throw new Error("Invalid UTF-8");
      output.push("�");
      index += 1;
      continue;
    }
    appendCodePoint(output, codePoint);
    index += length;
  }
  return { text: output.join(""), index };
}

function installLegacyTextCodecs(legacyWindow: LegacyWindow) {
  if (typeof legacyWindow.TextEncoder !== "function") {
    const LegacyTextEncoder = function () {
      return {
        encode(input?: string) {
          return new Uint8Array(utf8Bytes(input == null ? "" : input));
        },
      } as LegacyTextEncoder;
    } as unknown as typeof TextEncoder;
    legacyWindow.TextEncoder = LegacyTextEncoder;
  }

  if (typeof legacyWindow.TextDecoder !== "function") {
    const LegacyTextDecoder = function (_label?: string, options: LegacyTextDecoderOptions = {}) {
      let pending = new Uint8Array(0);
      const fatal = Boolean(options.fatal);
      return {
        decode(input?: ArrayBuffer | ArrayBufferView, decodeOptions: LegacyTextDecodeOptions = {}) {
          const incoming = toBytes(input);
          const bytes = new Uint8Array(pending.length + incoming.length);
          bytes.set(pending, 0);
          bytes.set(incoming, pending.length);
          const result = decodeUtf8(bytes, 0, fatal);
          if (decodeOptions.stream) {
            pending = bytes.slice(result.index);
            return result.text;
          }
          pending = new Uint8Array(0);
          return result.text;
        },
      } as LegacyTextDecoder;
    } as unknown as typeof TextDecoder;
    legacyWindow.TextDecoder = LegacyTextDecoder;
  }
}

function installLegacyReadableStream(legacyWindow: LegacyWindow) {
  if (typeof legacyWindow.ReadableStream === "function") return;

  const LegacyReadableStream = function (init: LegacyReadableStreamInit = {}) {
    const queue: unknown[] = [];
    const readers: Array<{
      resolve: (result: { done: boolean; value?: unknown }) => void;
      reject: (reason?: unknown) => void;
    }> = [];
    let closed = false;
    let failure: unknown;
    let started = false;

    const controller: LegacyStreamController = {
      enqueue(chunk: unknown) {
        if (closed) return;
        const reader = readers.shift();
        if (reader) reader.resolve({ done: false, value: chunk });
        else queue.push(chunk);
      },
      close() {
        if (closed) return;
        closed = true;
        while (readers.length) readers.shift()!.resolve({ done: true });
      },
      error(reason?: unknown) {
        if (closed) return;
        closed = true;
        failure = reason;
        while (readers.length) readers.shift()!.reject(reason);
      },
    };

    const stream: LegacyReadableStream = {
      getReader() {
        return {
          read() {
            if (queue.length) return Promise.resolve({ done: false, value: queue.shift() });
            if (failure) return Promise.reject(failure);
            if (closed) return Promise.resolve({ done: true });
            return new Promise((resolve, reject) => readers.push({ resolve, reject }));
          },
          releaseLock() {
            return undefined;
          },
          cancel(reason?: unknown) {
            queue.length = 0;
            closed = true;
            failure = undefined;
            return Promise.resolve(init.cancel?.(reason));
          },
        };
      },
    };

    if (!started && init.start) {
      started = true;
      try {
        const result = init.start(controller);
        if (result && typeof (result as Promise<void>).catch === "function") {
          void (result as Promise<void>).catch((reason) => controller.error(reason));
        }
      } catch (reason) {
        controller.error(reason);
      }
    }
    return stream;
  } as unknown as typeof ReadableStream;

  legacyWindow.ReadableStream = LegacyReadableStream;
}

export function installLegacyWebPlatformPolyfills() {
  if (typeof window === "undefined") return;
  const legacyWindow = window as LegacyWindow;
  installLegacyTextCodecs(legacyWindow);
  installLegacyReadableStream(legacyWindow);
}
