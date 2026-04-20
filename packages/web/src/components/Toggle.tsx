import { createSignal, type JSX, onMount } from "solid-js";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle(props: ToggleProps): JSX.Element {
  const [mounted, setMounted] = createSignal(false);

  onMount(() => {
    // Delay enabling transitions until after initial render
    requestAnimationFrame(() => setMounted(true));
  });

  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      disabled={props.disabled}
      onClick={() => props.onChange(!props.checked)}
      class={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-maroon-700 focus:ring-offset-2 ${
        mounted() ? "transition-colors duration-200 ease-in-out" : ""
      } ${props.checked ? "bg-maroon-700" : "bg-gray-200"} ${props.disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span
        class={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 ${
          mounted() ? "transition duration-200 ease-in-out" : ""
        } ${props.checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}
