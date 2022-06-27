<script lang="ts">

  import { onDestroy, onMount, tick } from "svelte";
  import { sleep } from "../functions";
  import KinopoiskDualsubs from "./components/KinopoiskDualsubs.svelte";
  import Thumbler from "./components/Thumbler.svelte";

  import { visiblePopup } from "./stores/visiblePopup";
  import { settings } from "./stores/settings";

  let visible = false;
  let slideDown = false;
  let slideDownFullScreenController = false;
  let visibleFullScreenController = false;
  let appContainer:HTMLElement;

  let hideTimeoutNonActive:NodeJS.Timeout;
  let hideFullScreenControllerTimeout:NodeJS.Timeout;
  let checkVideoPlayerOpenedInterval:NodeJS.Timer;

  let videoPlayerElement:HTMLElement;

  const setVisible = async (newVal:boolean) => {
    if (newVal) {
      visible = newVal;
      await tick();
      slideDown = true;
      createNonActiveTimeoutHide();
    } else {
      slideDown = false;
      await tick();
      await sleep(100);
      visible = newVal;
    }
  }

  const setVisibleFullScreenController = async (newVal:boolean) => {
    if (newVal) {
      visibleFullScreenController = newVal;
      await tick();
      slideDownFullScreenController = true;
      createNonActiveTimeoutHideFullScreenController();
    } else {
      slideDownFullScreenController = false;
      await tick();
      await sleep(100);
      visibleFullScreenController = newVal;
    }
  }

  const createNonActiveTimeoutHide = () => {
    deleteNonActiveTimeoutHide();
    hideTimeoutNonActive = setTimeout(() => {
      hide();
    }, visibleFullScreenController ? 550 : 1550);
  }


  const deleteNonActiveTimeoutHide = () => {
    clearTimeout(hideTimeoutNonActive)
  }

  const createNonActiveTimeoutHideFullScreenController = () => {
    deleteNonActiveTimeoutHideFullScreenController();
  }

  const deleteNonActiveTimeoutHideFullScreenController = () => {
    clearTimeout(hideFullScreenControllerTimeout);
    
    hideFullScreenControllerTimeout = setTimeout(() => {
      setVisibleFullScreenController(false);
    }, 5000);

  }

  const hide = () => {
    visiblePopup.set(false)
  }

  const show = () => {
    visiblePopup.set(true);
  }

  const isOpenedVideoPlayer = ():boolean => {
    return !!videoPlayerElement;
  }

  const mouseMoveHandle = () => {
    if (!visibleFullScreenController && isOpenedVideoPlayer()) {
      setVisibleFullScreenController(true);
    }
  }

  $: {
    if (appContainer && isOpenedVideoPlayer() && visibleFullScreenController) {
      videoPlayerElement.appendChild(appContainer);
    } else if (appContainer && !visibleFullScreenController && !isOpenedVideoPlayer()) {
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

  onMount(() => {
    checkVideoPlayerOpenedInterval = setInterval(() => {
      let pl = document.querySelector(`[class*="Player__root"`) as HTMLVideoElement;
      if (videoPlayerElement !== pl) {
        videoPlayerElement = pl;
        if (videoPlayerElement) {
          setVisibleFullScreenController(true);
        }
      }
    }, 300);
  })

  onDestroy(() => {
    clearInterval(checkVideoPlayerOpenedInterval);
  })

</script>
<svelte:window on:mousemove={mouseMoveHandle}></svelte:window>

{#if $settings}
  <KinopoiskDualsubs/>
{/if}

<div bind:this={appContainer} class="dark">
  {#if $settings}
      {#if !visible && videoPlayerElement}
        <div>
          <div class="pr-6 py-6 screenfixed" on:click={(e) => {
            console.log(e);
            show();
          }}>
            <div class="stroke-true-gray-50 text-shadow-dark-900 text-shadow-md w-25 h-25 items-center justify-center cursor-pointer hover:opacity-75 flex text-true-gray-50 transform transition-transform,opacity duration-100 {slideDownFullScreenController ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0 pointer-events-none"}">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
          </div>
        </div>
      {/if}
      {#if visible}
        <div>
          <div class="pr-4 w-156 py-6 screenfixed" on:mouseenter={() => deleteNonActiveTimeoutHide()} on:mouseleave={() => createNonActiveTimeoutHide()}>
            <div class="{slideDown ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0 pointer-events-none"} widget dark:bg-dark-800 dark:text-gray-300">
              <div class="flex pt-6">
                <Thumbler id="enabled" bind:checked={$settings.doublesubs_enabled} label="Двойные субтитры"/>
              </div>
              <div class="flex">
                <Thumbler id="black_background_enabled" bind:checked={$settings.black_background_enabled} label="Черный фон субтитров"/>
              </div>
              <div class="flex">
                <Thumbler id="hightlight_primary_cue_enabled" bind:checked={$settings.hightlight_primary_cue_enabled} label="Выделить цветом"/>
              </div>
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