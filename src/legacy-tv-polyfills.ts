type LegacyCustomEventInit = {
  bubbles?: boolean;
  cancelable?: boolean;
  detail?: unknown;
};

export function installLegacyCustomEvent() {
  const legacyWindow = window as Window & {
    CustomEvent?: typeof CustomEvent;
  };
  if (typeof legacyWindow.CustomEvent === "function") return;

  const LegacyCustomEvent = function (this: Event, type: string, init: LegacyCustomEventInit = {}) {
    const event = document.createEvent("CustomEvent");
    event.initCustomEvent(type, Boolean(init.bubbles), Boolean(init.cancelable), init.detail);
    return event;
  } as unknown as typeof CustomEvent;

  legacyWindow.CustomEvent = LegacyCustomEvent;
}
