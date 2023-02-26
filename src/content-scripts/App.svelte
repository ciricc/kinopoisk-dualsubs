<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { isMac, sleep } from "../functions";
  import KinopoiskDualsubs from "./components/KinopoiskDualsubs.svelte";
  import Thumbler from "./components/Thumbler.svelte";

  import { visiblePopup } from "./stores/visiblePopup";
  import { settings } from "./stores/settings";
  import HotKey from "./components/HotKey.svelte";

  let visible = false;
  let slideDown = false;
  let slideDownFullScreenController = false;
  let visibleFullScreenController = false;
  let appContainer: HTMLElement;

  let hideTimeoutNonActive: NodeJS.Timeout;
  let hideFullScreenControllerTimeout: NodeJS.Timeout;
  let checkVideoPlayerOpenedInterval: NodeJS.Timer;

  let videoPlayerElement: HTMLElement;
  let showedControls = false;
  let videoPaused: boolean;

  const setVisible = async (newVal: boolean) => {
    if (newVal) {
      showedControls = true;
      visible = newVal;
      await tick();
      slideDown = true;
      createNonActiveTimeoutHide();
    } else {
      if (showedControls && $settings.show_hotkeys_onboarding) {
        $settings.show_hotkeys_onboarding = false;
      }
      slideDown = false;
      await tick();
      await sleep(100);
      visible = newVal;
    }
  };

  const setVisibleFullScreenController = async (
    newVal: boolean,
    autoHide = true
  ) => {
    if (newVal) {
      visibleFullScreenController = newVal;
      await tick();
      slideDownFullScreenController = true;
      if (!autoHide) return clearTimeout(hideFullScreenControllerTimeout);
      createNonActiveTimeoutHideFullScreenController();
    } else {
      slideDownFullScreenController = false;
      await tick();
      await sleep(100);
      visibleFullScreenController = newVal;
    }
  };

  const createNonActiveTimeoutHide = () => {
    deleteNonActiveTimeoutHide();
    hideTimeoutNonActive = setTimeout(
      () => {
        hide();
      },
      visibleFullScreenController ? 550 : 1550
    );
  };

  const deleteNonActiveTimeoutHide = () => {
    clearTimeout(hideTimeoutNonActive);
  };

  const createNonActiveTimeoutHideFullScreenController = () => {
    deleteNonActiveTimeoutHideFullScreenController();
  };

  const deleteNonActiveTimeoutHideFullScreenController = () => {
    clearTimeout(hideFullScreenControllerTimeout);

    hideFullScreenControllerTimeout = setTimeout(() => {
      setVisibleFullScreenController(false);
    }, 2500);
  };

  const hide = () => {
    visiblePopup.set(false);
  };

  const show = () => {
    visiblePopup.set(true);
  };

  const isOpenedVideoPlayer = (): boolean => {
    return !!videoPlayerElement;
  };

  const mouseMoveHandle = () => {
    if (!visibleFullScreenController && isOpenedVideoPlayer()) {
      setVisibleFullScreenController(true);
    }
  };

  $: {
    if (isOpenedVideoPlayer) {
      if (videoPaused) {
        setVisibleFullScreenController(true, false);
      } else {
        setVisibleFullScreenController(true);
      }
    }
  }

  $: {
    if (appContainer && isOpenedVideoPlayer() && visibleFullScreenController) {
      videoPlayerElement.appendChild(appContainer);
    } else if (
      appContainer &&
      !visibleFullScreenController &&
      !isOpenedVideoPlayer()
    ) {
      document.body.appendChild(appContainer);
    }
  }

  $: {
    if ($visiblePopup) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }

  $: {
    if ($settings) {
      $settings.black_background_enabled = true;
    }
  }

  onMount(() => {
    checkVideoPlayerOpenedInterval = setInterval(() => {
      let pl = document.querySelector(
        `[class*="PlayerSkin_layout"]`
      ) as HTMLElement;
      if (!pl) {
        pl = document.querySelector(`yaplayertag`);
      }
      if (videoPlayerElement !== pl) {
        videoPlayerElement = pl;
        if (videoPlayerElement) {
          setVisibleFullScreenController(true);
        }
      }
    }, 300);
  });

  onDestroy(() => {
    clearInterval(checkVideoPlayerOpenedInterval);
  });

  const CtrlKey = !isMac() ? "Ctrl" : "⌘";
  $: {
    console.log("video player element", videoPlayerElement);
  }

  window["is_dualsubsUser"] = true;
  // var scriptElementCode = `fetch("https://api.ott.kinopoisk.ru", {})`;
  // var scriptElement = document.createElement("script");
  // scriptElement.textContent = scriptElementCode;
  // document.body.appendChild(scriptElement);
  onMount(() => console.log("Mounted"));
</script>

<svelte:window on:mousemove={mouseMoveHandle} />

<div bind:this={appContainer} class="dark">
  {#if $settings && videoPlayerElement}
    <KinopoiskDualsubs bind:videoPaused />
  {/if}
  {#if $settings}
    {#if !visible && videoPlayerElement}
      <div>
        <div class="pr-6 py-6 screenfixed" on:click={() => show()}>
          <div
            class="stroke-true-gray-50 text-shadow-dark-900 text-shadow-md w-25 h-25 items-center justify-center cursor-pointer hover:opacity-75 flex text-true-gray-50 transform transition-transform,opacity duration-100 {slideDownFullScreenController
              ? 'translate-y-0 opacity-100'
              : '-translate-y-10 opacity-0 pointer-events-none'}"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
          </div>
        </div>
      </div>
    {/if}
    {#if visible}
      <div>
        <div
          class="pr-4 w-156 py-6 screenfixed"
          on:mouseenter={() => deleteNonActiveTimeoutHide()}
          on:mouseleave={() => createNonActiveTimeoutHide()}
        >
          <div
            class="{slideDown
              ? 'translate-y-0 opacity-100'
              : '-translate-y-10 opacity-0 pointer-events-none'} widget dark:bg-dark-800 dark:text-gray-300"
          >
            <div class="flex pt-6">
              <Thumbler
                id="enabled"
                bind:checked={$settings.doublesubs_enabled}
                label="Двойные субтитры"
              />
            </div>
            <div class="flex">
              <Thumbler
                id="hightlight_primary_cue_enabled"
                bind:checked={$settings.hightlight_primary_cue_enabled}
                label="Выделить цветом"
              />
            </div>
            <div class="flex">
              <Thumbler
                id="hotkeys_enabled"
                bind:checked={$settings.hotkeys_enabled}
                on:change={() => {
                  $settings.show_hotkeys_onboarding = true;
                }}
                label="Горячие клавиши"
              />
            </div>
            {#if $settings && $settings.hotkeys_enabled && $settings.show_hotkeys_onboarding}
              <div class="px-6 text-2xl pt-6 pb-2 dark:text-true-gray-200">
                <div class="flex space-x-4 items-center py-2">
                  <HotKey>{CtrlKey}</HotKey><span>+</span><HotKey>&lt;</HotKey
                  ><span class="pl-4 flex-1">Предыдущая реплика</span>
                </div>
                <div class="flex space-x-4 items-center py-2">
                  <HotKey>{CtrlKey}</HotKey><span>+</span><HotKey>&gt;</HotKey
                  ><span class="pl-4 flex-1">Следующая реплика</span>
                </div>
                <div class="flex space-x-4 items-center py-2">
                  <HotKey>Shift</HotKey><span>+</span><HotKey>S</HotKey><span
                    class="pl-4 flex-1">Вкл/Выкл расширение</span
                  >
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .screenfixed {
    @apply select-none fixed top-0 right-0 block z-10000;
  }

  .widget {
    @apply transform transition-transform duration-100 bg-white min-w-96 pb-6;
    @apply rounded-xl shadow-dark-900/20 shadow-xl text-lg overflow-hidden;
  }
</style>
