<script lang="ts">
  import {
    getContentChildren,
    getContentMetadata,
    getContentStreamsMetadata,
    getWatchParams,
  } from "../../lib/KinopoiskOTTApi";
  import type {
    PlayerContentInformation,
    PlayerSubtitles,
    PlayerWatchParams,
  } from "../../types";
  import { onDestroy } from "svelte";
  import { settings } from "../stores/settings";
  import { Cue, srtParser } from "../../lib/srtParser";
  import PlayerHotKeys from "./PlayerHotKeys.svelte";

  const LANGAUGES = {
    RUS: "rus",
    RUSX18: "rus-x-18",
    ENG: "eng",
  };

  enum CogType {
    Rate = "rate",
    Quality = "quality",
    Unknown = "",
  }

  const MAX_INTERVAL_WORK_TIME = 60000; // ms
  const CHECK_INTERVAL_TIME = 200;

  const activeBlackBgClass = "kinopoisk-dualsubs--enable-dark-bg";
  const activeHighlightClass =
    "kinopoisk-dualsubs--enable-highlight-primary-cue";
  const activeExtensionClass = "kinopoisk-dualsubs--enabled";

  let cachedSubtiles: Record<string, string> = {};
  let pageUrl: string = document.location.href;
  let originalCuesPositionBottom = 0;
  let contentInfo: PlayerContentInformation = {
    season: 0,
    episode: 0,
    filmId: "",
  };

  let watchParams: PlayerWatchParams = {
    subtitleLanguage: "",
  };

  let renderingSubtitles: PlayerSubtitles;

  let checkPageUrlChangeInterval: NodeJS.Timeout;
  let checkVideoExistingInterval: NodeJS.Timeout;
  let checkVideoCuesInterval: NodeJS.Timeout;
  let checkingOriginalSubtitlesYPosition = false;
  let watchingLocalStorage = false;

  let parsedCues: Cue[] = [];
  let enabled: boolean = false;
  let currentAltCues: string[] = [];
  let currentCueIndex: null | number = null;
  let currentPrimaryCueText = "";
  export let videoPaused: boolean = false;
  let subtitlesSizeRatio: number = 1;
  let windowCuesElement: HTMLElement | null = null;

  const getContentInformation = (): PlayerContentInformation => {
    let currentLocation = document.location.pathname.split("/");
    let params = new URLSearchParams(document.location.search);
    let episodeNumber = +params.get("episode");
    let seasonNumber = +params.get("season");
    return {
      episode: isNaN(episodeNumber) ? 0 : episodeNumber,
      season: isNaN(seasonNumber) ? 0 : seasonNumber,
      filmId: params.get("rt") || currentLocation[2] || "",
    };
  };

  const updateWatchParams = async () => {
    console.log("Getting watch params by film", contentInfo.filmId);
    watchParams = await getWatchParams(contentInfo.filmId);
    console.log("Loaded watch params", watchParams);
  };

  const loadContentSubtitles = async () => {
    console.log("Loading subtitles", contentInfo.filmId);
    let metadata = await getContentMetadata(contentInfo.filmId);
    let contentId = contentInfo.filmId;
    if (
      metadata.contentType === "tv-series" &&
      contentInfo.season &&
      contentInfo.episode >= 0
    ) {
      let tv = await getContentChildren(contentId);
      console.log("Loaded tv", tv.seasons);
      let episode = tv.seasons[contentInfo.season - 1].episodes.find(
        (ep) => ep.number === contentInfo.episode
      );
      contentId = contentId ? (episode.filmId as string) : "";
    }

    if (!contentId) return;

    let streamsMetadata = await getContentStreamsMetadata(contentId);
    if (watchParams.subtitleLanguage.startsWith("sid")) {
      let index = parseInt(watchParams.subtitleLanguage.replace("sid", ""));
      if (streamsMetadata.streams[0].subtitles[index]) {
        watchParams.subtitleLanguage =
          streamsMetadata.streams[0].subtitles[index].language;
      }
    }

    let subs = streamsMetadata.streams[0].subtitles.find((sub) => {
      return (
        ((sub.language === LANGAUGES.RUS ||
          sub.language === LANGAUGES.RUSX18) &&
          watchParams.subtitleLanguage === LANGAUGES.ENG) ||
        (sub.language === LANGAUGES.ENG &&
          (watchParams.subtitleLanguage === LANGAUGES.RUS ||
            watchParams.subtitleLanguage === LANGAUGES.RUSX18))
      );
    });

    if (subs) {
      renderingSubtitles = subs;
    }
  };

  const handleDomChangeLanguage = (e: MouseEvent) => {
    let el = e.target as HTMLElement;
    if (el && el.getAttribute("type") === "radio") {
      let val = el.getAttribute("value");
      if (!Object.values(CogType).includes(val as CogType)) {
        // Если мы сейчас уже открыли какую-то шестеренку - проверяем значение
        const isAudioIdRadio = val.includes("aid");
        const isSubtitlesIdRadio =
          val.includes("sid") || val.includes("subtitles");

        if (isSubtitlesIdRadio || isAudioIdRadio) {
          if (isSubtitlesIdRadio) {
            if (val.includes("sid")) {
              watchParams.subtitleLanguage = val;
            } else {
              watchParams.subtitleLanguage = el
                .getAttribute("value")
                .split("/")[1];
            }
          } else if (val == "") {
            watchParams.subtitleLanguage = "";
            clearSubtitles();
          }

          return;
        }
      }
    }
  };

  const loadSubtitles = async (path: string) => {
    if (cachedSubtiles[path]) return cachedSubtiles[path];
    let body = await fetch(path, {
      credentials: "include",
    });
    let subs = await body.text();
    cachedSubtiles[path] = subs;
    return subs;
  };

  const updateSubtitles = async () => {
    let subs = await loadSubtitles(renderingSubtitles.url);
    if (!subs) return;
    parsedCues = srtParser(subs);
  };

  const changeCueHandler = (e: Event) => {
    const track = e.target as TextTrack;
    console.log("Track change", track)
    if (track.activeCues.length) {
      if (!currentAltCues.length && parsedCues.length) fillAltCues();
      const activeCue = track.activeCues[0] as VTTCue;
      currentPrimaryCueText = activeCue.text;
      const primaryCueIndex = Array.from(track.cues).indexOf(activeCue);
      console.log("Active cue", activeCue, primaryCueIndex)
      if (primaryCueIndex !== -1) {
        currentCueIndex = primaryCueIndex;
        return;
      }
      currentCueIndex = null;
      return;
    }
    currentCueIndex = null;
    currentPrimaryCueText = "";
  };

  const handleChangeVideoState = (e: Event) => {
    const video = e.target as HTMLVideoElement;
    if (video.paused) {
      videoPaused = true;
    } else {
      videoPaused = false;
    }
  };

  const findActiveVideoTextTrack = (videoElem:HTMLVideoElement):TextTrack|null => {
    if (!videoElem) return null
    if (!videoElem.textTracks.length) return null;
    // console.log(Array.from(videoElem.textTracks))
    const textTrack = Array.from(videoElem.textTracks).find(el => el.language == watchParams.subtitleLanguage)
    console.log("Watch params", watchParams, "text track found", textTrack, Array.from(videoElem.textTracks))
    return textTrack || null;
  }

  const handleChangeVideoTracks = () => {
    console.log("Handl change video tracks")
    clearInterval(checkVideoCuesInterval);
    let intervalStart = Date.now();
    const checkCues = async () => {
      if (Date.now() - intervalStart >= MAX_INTERVAL_WORK_TIME)
        clearInterval(checkVideoCuesInterval);
      let videos = document.body.getElementsByTagName("video");
      console.log("Found text track", findActiveVideoTextTrack(videos[0]))
      if (findActiveVideoTextTrack(videos[0])) {
        clearInterval(checkVideoCuesInterval);
        fillAltCues();
        console.log("video add listener")
        findActiveVideoTextTrack(videos[0]).addEventListener("cuechange", changeCueHandler);
      } else {
        clearSubtitles();
      }
    };

    checkVideoCuesInterval = setInterval(() => {
      checkCues();
    }, CHECK_INTERVAL_TIME);
    checkCues();
  };

  const clearSubtitles = () => {
    currentPrimaryCueText = "";
    currentCueIndex = null;
    currentAltCues = [];
  };

  const fillAltCues = () => {
    currentAltCues = [];
    let videos = document.body.getElementsByTagName("video");
    let video = videos[0];
    // video.style.display = "hidden"
    const videoTextTrack = findActiveVideoTextTrack(video)
    let cues = Array.from(videoTextTrack.cues);
    console.log("Parsed cues", parsedCues, videoTextTrack, cues.length)
    if (!parsedCues.length) {return}
    for (let i = 0; i < cues.length; i++) {
      let maxCommonArea = 0;
      let maxCommonAreaJ = -1;

      for (let j = 0; j < parsedCues.length; j++) {
        let parsedCue = parsedCues[j];
        let cue = cues[i];

        let rightSide = Math.min(parsedCue.endTime / 1000, cue.endTime);
        let leftSide = Math.max(parsedCue.startTime / 1000, cue.startTime);

        let commonArea = rightSide - leftSide;
        if (commonArea >= 0) {
          if (maxCommonArea < commonArea) {
            maxCommonArea = commonArea;
            maxCommonAreaJ = j;
          }
          if (maxCommonAreaJ != -1 && maxCommonArea > commonArea) {
            break;
          }
        }
      }

      if (maxCommonAreaJ != -1) {
        currentAltCues.push(
          parsedCues[maxCommonAreaJ].text.replace(/\n/g, " ")
        );
      } else {
        currentAltCues.push("");
      }
    }
  };

  const clearCurrentCues = () => {
    renderingSubtitles = null;
    parsedCues = [];
  };

  const stepReplica = (i: number) => {
    let videos = document.body.getElementsByTagName("video");
    let video = videos[0];
    if (!video || !video.textTracks.length || !findActiveVideoTextTrack(video).cues) return;
    let cues = Array.from(findActiveVideoTextTrack(video).cues);
    if (cues.length) {
      let activeCues = findActiveVideoTextTrack(video).activeCues;
      if (activeCues.length) {
        let activeCue = activeCues[0];
        let activeCuesIndex = cues.indexOf(activeCue);
        if (activeCuesIndex != -1) {
          let newReplicaIndex = activeCuesIndex + i;
          if (newReplicaIndex >= cues.length) {
            newReplicaIndex = cues.length;
          } else if (newReplicaIndex < 0) {
            newReplicaIndex = 0;
          }
          video.currentTime = cues[newReplicaIndex].startTime;
          return;
        }
      } else {
        let currentTime = video.currentTime;
        let newCue: TextTrackCue | null = null;
        if (i > 0) {
          newCue = cues.find((el) => el.startTime > currentTime);
        } else {
          for (let i = 0; i < cues.length; i++) {
            let cue = cues[i];
            if (cue.startTime < currentTime) {
              newCue = cue;
            } else {
              break;
            }
          }
        }
        if (newCue) {
          video.currentTime = newCue.startTime;
        }
      }
    }
  };

  const stopIntervals = () => {
    clearInterval(checkPageUrlChangeInterval);
    clearInterval(checkVideoCuesInterval);
    clearInterval(checkVideoExistingInterval);
  };

  // Check toggle
  $: enabled = $settings.doublesubs_enabled;
  $: {
    if (enabled) {
      clearInterval(checkPageUrlChangeInterval);
      if (!checkingOriginalSubtitlesYPosition) {
        checkingOriginalSubtitlesYPosition = true;
        const moveOriginalQuesByY = () => {
          const elem = document.querySelector(`[class*="Subtitles_root"]`);
          if (elem) {
            const originalCuesRect = elem.getBoundingClientRect();
            const windowCuesElementRect: DOMRect | null = windowCuesElement
              ? windowCuesElement.getBoundingClientRect()
              : null;
            let heightOffset = originalCuesRect.height;
            if (originalCuesRect.y < window.innerHeight / 2) {
              heightOffset = Math.max(
                originalCuesRect.height,
                windowCuesElementRect ? windowCuesElementRect.height : null
              );
            }
            originalCuesPositionBottom =
              window.innerHeight - (originalCuesRect.y + heightOffset);
          }

          if (!checkingOriginalSubtitlesYPosition) return;
          requestAnimationFrame(moveOriginalQuesByY);
        };
        requestAnimationFrame(() => {
          moveOriginalQuesByY();
        });
      }

      checkPageUrlChangeInterval = setInterval(() => {
        if (pageUrl != document.location.href) {
          pageUrl = document.location.href;
        }
      }, CHECK_INTERVAL_TIME);
    }
  }

  $: {
    if (enabled) {
      document.body.classList.add(activeExtensionClass);
    } else {
      document.body.classList.remove(activeExtensionClass);
    }
  }

  $: {
    if (!enabled) {
      stopIntervals();
    }
  }


  // Check page url changing (film, tv series)
  $: {
    if (pageUrl) {
      contentInfo = getContentInformation();
    }
  }

  // Change player content information
  $: {
    if (contentInfo && contentInfo.filmId) {
      // when updates film
      clearCurrentCues();
      updateWatchParams();
    }
  }

  // Change watch params
  $: {
    if (watchParams && watchParams.subtitleLanguage && enabled) {
      // when changes subtitle language
      loadContentSubtitles();
    } else {
      clearCurrentCues();
    }
  }

  // Change active subtitles
  $: {
    if (renderingSubtitles) {
      updateSubtitles();
    }
  }

  // Change rendering cues
  $: {
    if (parsedCues) {
      clearInterval(checkVideoExistingInterval);
      if (parsedCues.length || true) {
        let intervalStart = Date.now();
        checkVideoExistingInterval = setInterval(() => {
          let videos = document.body.getElementsByTagName("video");

          if (
            !videos.length ||
            !videos[0].textTracks ||
            !videos[0].textTracks.length
          ) {
            if (Date.now() - intervalStart >= MAX_INTERVAL_WORK_TIME)
              clearInterval(checkVideoExistingInterval);
            return;
          }

          clearInterval(checkVideoExistingInterval);

          videos[0].textTracks.removeEventListener(
            "change",
            handleChangeVideoTracks
          );

          videos[0].removeEventListener("play", handleChangeVideoState);
          videos[0].removeEventListener("pause", handleChangeVideoState);

          videos[0].textTracks.addEventListener(
            "change",
            handleChangeVideoTracks
          );

          videos[0].addEventListener("play", handleChangeVideoState);
          videos[0].addEventListener("pause", handleChangeVideoState);

          videoPaused = videos[0].paused;
          handleChangeVideoTracks();
        }, CHECK_INTERVAL_TIME);
      }
    }
  }

  $: {
    if ($settings.black_background_enabled) {
      document.body.classList.add(activeBlackBgClass);
    } else {
      document.body.classList.remove(activeBlackBgClass);
    }
  }
  
  $: {
    // console.log("Enabled", enabled)
    // console.log("Subtitles pos", originalCuesPositionBottom)
    // console.log("Current primary cue text", currentPrimaryCueText)
    // console.log("Loaded alt subtitles", currentAltCues)
    // console.log("Currennt alt cue index", currentCueIndex)  
  }

  $: {
    if ($settings.hightlight_primary_cue_enabled) {
      document.body.classList.add(activeHighlightClass);
    } else {
      document.body.classList.remove(activeHighlightClass);
    }
  }

  const syncWithLocalStorage = () => {
    let lsSubtitlesSizeRatio = +localStorage.getItem("subtitlesRatio");
    if (
      lsSubtitlesSizeRatio &&
      !isNaN(lsSubtitlesSizeRatio) &&
      lsSubtitlesSizeRatio != subtitlesSizeRatio
    ) {
      subtitlesSizeRatio = lsSubtitlesSizeRatio;
    }
    if (!watchingLocalStorage) return;
    requestAnimationFrame(syncWithLocalStorage);
  };

  watchingLocalStorage = true;
  syncWithLocalStorage();
  onDestroy(() => {
    watchingLocalStorage = false;
    stopIntervals();
  });
</script>

<svelte:body on:click={handleDomChangeLanguage} />
<PlayerHotKeys
  enabled={$settings.hotkeys_enabled}
  on:nextreplica={() => stepReplica(1)}
  on:prevreplica={() => stepReplica(-1)}
  on:toggledualsubs={() => {
    $settings.doublesubs_enabled = !$settings.doublesubs_enabled;
  }}
/>
{#if enabled}
  {#if originalCuesPositionBottom}
    <div
      bind:this={windowCuesElement}
      class="extension--cues {videoPaused ? 'kplayer--paused' : ''}"
      style="transform: translateY(-{originalCuesPositionBottom}px) scale({subtitlesSizeRatio});"
    >
      <div class="extension--cues-window">
        {#if currentPrimaryCueText}
          <div
            class="extension--cue-line extension--primary-cue {currentAltCues.length
              ? ''
              : 'no-highlight'}"
          >
            {@html currentPrimaryCueText.replaceAll("\n", "<br/>")}
          </div>
        {/if}
        {#if currentCueIndex != null && currentAltCues[currentCueIndex]}
          <div class="extension--cue-line extension--alternative-cue">
            {@html currentAltCues[currentCueIndex]}
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}

<style>
  :global(.kinopoisk-dualsubs--enabled
      [class*="Subtitles_root"]
      [class*="Subtitles_text"]),
  :global(.kinopoisk-dualsubs--enabled
      [class*="Subtitles_root"]
      [class*="Subtitles_new-text"]) {
    @apply opacity-0;
  }

  :global(.kinopoisk-dualsubs--enabled
      [class*="PlayerSkin_layout"]
      [class*="Layout_bottom"]),
  :global(.kinopoisk-dualsubs--enabled
      [class*="PlayerSkin_layout"]
      [class*="ContextMenu_root"]) {
    @apply z-2;
  }

  :global(.extension--cues) {
    @apply fixed flex flex-col px-4 text-shadow-xl shadow-black select-none pointer-events-none w-full bottom-0 text-white text-4xl justify-center items-center;
  }

  :global(.extension--cues-window) {
    @apply inline-flex flex-col justify-center items-center;
  }

  :global(.extension--cue-line) {
    @apply inline-block p-4 px-8 text-center w-full;
  }

  :global(.extension--cue-line.extension--alternative-cue) {
    @apply pt-2 pb-6 text-4xl text-true-gray-300 transition-all ease-out duration-200;
  }

  :global(.kplayer--paused .extension--cue-line.extension--alternative-cue) {
    @apply text-true-gray-100;
  }

  :global(.kinopoisk-dualsubs--enable-dark-bg .extension--cues-window) {
    @apply bg-black/75 rounded-lg overflow-hidden;
  }

  :global(.extension--primary-cue) {
    @apply text-5xl font-semibold;
  }

  :global(.kinopoisk-dualsubs--enable-highlight-primary-cue
      .extension--primary-cue) {
    @apply !text-yellow-300;
  }

  :global(.extension--primary-cue.no-highlight) {
    @apply !text-white font-normal;
  }
</style>
