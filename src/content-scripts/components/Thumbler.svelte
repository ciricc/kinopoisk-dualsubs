<script lang="ts">
  import { createEventDispatcher } from "svelte";
  export let id: string = "";
  export let checked: boolean = false;
  export let label: string = "";
  const dispatch = createEventDispatcher();
</script>

<label
  for={id}
  class="{checked
    ? 'checked'
    : ''} flex-auto select-none py-6 flex items-center px-8 cursor-pointer relative hover:bg-gray-100 dark:hover:bg-true-gray-800"
>
  <input
    bind:checked
    on:change={() => {
      dispatch("change");
    }}
    type="checkbox"
    {id}
    class="sr-only"
  />
  <div
    class="toggle-bg bg-gray-400 relative border-2 border-solid border-gray-400 h-11 max-h-11 w-18 rounded-full"
  />
  <span class="ml-7 text-dark-900 dark:text-true-gray-300 text-2xl"
    >{label}</span
  >
</label>

<style>
  .toggle-bg:after {
    content: "";
    @apply absolute top-0 left-0.5 bg-gray-50 rounded-full h-9 w-9 transition shadow-sm;
  }

  .checked .toggle-bg:after {
    transform: translateX(1.6rem);
  }

  .checked .toggle-bg {
    @apply bg-orange-500 border-orange-500;
  }
</style>
