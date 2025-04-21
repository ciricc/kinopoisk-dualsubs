<script lang="ts">
  import type {
    PlayerContentInformation,
    PlayerSubtitles as PlayerSubtitlesConfig,
    PlayerWatchParams,
  } from "../../types";
  import { onDestroy, onMount } from "svelte";
  import { settings } from "../stores/settings";
  import { Cue, srtParser } from "../../lib/srtParser";
  import PlayerHotKeys from "./PlayerHotKeys.svelte";
  import {
    getContentChildren,
    getContentMetadata,
    getContentStreamsMetadata,
    getWatchParams,
  } from "../../lib/scriptsConnector";

  enum CogType {
    Rate = "rate",
    Quality = "quality",
    SubtitlesSize = "subtitlesSize",
    Unknown = "",
  }

  const LANGAUGES = {
    RUS: "rus",
    RUSX18: "rus-x-18",
    ENG: "eng",
  };

  const MAX_INTERVAL_WORK_TIME = 60000; // ms
  const CHECK_INTERVAL_TIME = 200;

  const activeBlackBgClass = "kinopoisk-dualsubs--enable-dark-bg";
  const activeHighlightClass =
    "kinopoisk-dualsubs--enable-highlight-primary-cue";
  const activeExtensionClass = "kinopoisk-dualsubs--enabled";

  let cachedSubtiles: Record<string, string> = {};
  let pageUrl: string = document.location.href;
  let contentInfo: PlayerContentInformation = {
    season: 0,
    episode: 0,
    filmId: "",
  };

  let watchParams: PlayerWatchParams = {
    subtitleLanguage: "",
  };

  let subtitlesPortalElement: HTMLElement = null;

  let altPlayerSubtitlesConfig: PlayerSubtitlesConfig;

  let checkPageUrlChangeInterval: NodeJS.Timeout;
  let checkVideoExistingInterval: NodeJS.Timeout;
  let checkVideoCuesInterval: NodeJS.Timeout;
  let watchingLocalStorage = false;
  let enabled: boolean = false;

  let parsedAltSrtCues: Cue[] = [];
  let indexedAltCues: string[] = [];

  let currentPrimaryCueIndex: null | number = null;
  let currentPrimaryCueText = "";

  export let videoPaused: boolean = false;

  let subtitlesSizeRatio: number = 1;
  let windowCuesElement: HTMLElement | null = null;
  let videoPausedByExtension = false;
  let activeVideoTrack: TextTrack | null = null;

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

  const isRussianLanguage = (languageCode: string): boolean => {
    return languageCode === LANGAUGES.RUS || languageCode === LANGAUGES.RUSX18;
  };

  const isEnglishLanguage = (languageCode: string): boolean => {
    return languageCode === LANGAUGES.ENG;
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
      let episode = tv.seasons[contentInfo.season - 1].episodes.find(
        (ep) => ep.number === contentInfo.episode,
      );

      contentId = contentId ? (episode.filmId as string) : "";
    }

    if (!contentId) return;

    let streamsMetadata = await getContentStreamsMetadata(contentId);

    if (watchParams.subtitleLanguage.startsWith("sid")) {
      let index = parseInt(watchParams.subtitleLanguage.replace("sid", ""));
      console.info(
        "subtitle language is a sid",
        "streams",
        streamsMetadata.streams[0],
        "sid",
        index,
      );
      if (streamsMetadata.streams[0].subtitles[index]) {
        watchParams.subtitleLanguage =
          streamsMetadata.streams[0].subtitles[index].language;
      } else {
        console.error("Can't convert sid language to language code");
      }
    }

    let subs = streamsMetadata.streams[0].subtitles.find((sub) => {
      if (isEnglishLanguage(watchParams.subtitleLanguage)) {
        return sub.language === LANGAUGES.RUS;
      } else if (isRussianLanguage(watchParams.subtitleLanguage)) {
        return sub.language === LANGAUGES.ENG;
      }

      return false;
    });

    if (subs) {
      console.log(
        "Loaded new alt subtitles",
        "lang",
        subs.language,
        "primaryLang",
        watchParams.subtitleLanguage,
      );

      altPlayerSubtitlesConfig = subs;
    } else {
      console.error(
        "Not found alternative subtitles",
        "primaryLang",
        watchParams.subtitleLanguage,
        "streamLanguages",
        streamsMetadata.streams[0].subtitles.map((s) => s.language),
      );
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
    let altSUbs = await loadSubtitles(altPlayerSubtitlesConfig.url);

    if (!altSUbs)
      return console.error(
        "There is no any subtitles",
        "url",
        altPlayerSubtitlesConfig.url,
      );

    parsedAltSrtCues = srtParser(altSUbs);
  };

  const changeCueHandler = (e: Event) => {
    const track = e.target as TextTrack;

    activeVideoTrack = track;
    if (
      watchParams.subtitleLanguage != activeVideoTrack.language &&
      activeVideoTrack.language
    ) {
      watchParams.subtitleLanguage = activeVideoTrack.language;
    }

    if (track.activeCues.length) {
      if (!indexedAltCues.length && parsedAltSrtCues.length)
        prepareAltCuesList();
      const activeCue = track.activeCues[0] as VTTCue;

      currentPrimaryCueText = activeCue.text;
      const primaryCueIndex = Array.from(track.cues).indexOf(activeCue);

      if (primaryCueIndex !== -1) {
        currentPrimaryCueIndex = primaryCueIndex;
        return;
      }

      currentPrimaryCueIndex = null;
      return;
    } else {
      console.warn("There is no active cues", track);
    }

    currentPrimaryCueIndex = null;
    currentPrimaryCueText = "";
  };

  const handleChangeVideoState = (e: Event) => {
    const video = e.target as HTMLVideoElement;
    if (video.paused) {
      videoPaused = true;
    } else {
      hideSkyDialog();
      window.getSelection()?.removeAllRanges();
      videoPaused = false;
    }
  };

  const hideSkyDialog = () => {
    const dialog = document.querySelector(".wt-sky-long-dialog,.wt-sky-dialog");
    if (dialog) dialog.remove();
  };

  const findActiveVideoTextTrack = (
    videoElem: HTMLVideoElement,
  ): TextTrack | null => {
    if (!videoElem) return null;
    if (!videoElem.textTracks.length) return null;

    const textTracks = Array.from(videoElem.textTracks);
    let textTrack = textTracks.find(
      (el) =>
        el.language == watchParams.subtitleLanguage && el.mode != "disabled",
    );

    if (!textTrack || !textTrack.cues.length) {
      textTrack = textTracks.find((el) => el.cues && el.cues.length);
    }

    console.log(
      "Found text track",
      textTrack,
      textTracks,
      "count cues",
      textTrack?.cues?.length,
    );
    return textTrack || null;
  };

  const handleChangeVideoTracks = () => {
    clearInterval(checkVideoCuesInterval);

    let intervalStart = Date.now();

    const checkCues = async () => {
      if (Date.now() - intervalStart >= MAX_INTERVAL_WORK_TIME)
        clearInterval(checkVideoCuesInterval);
      let videos = document.body.getElementsByTagName("video");
      if (findActiveVideoTextTrack(videos[0])) {
        clearInterval(checkVideoCuesInterval);
        prepareAltCuesList();
        findActiveVideoTextTrack(videos[0]).addEventListener(
          "cuechange",
          changeCueHandler,
        );
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
    console.log("Clearing subtitles");

    currentPrimaryCueText = "";
    currentPrimaryCueIndex = null;
    indexedAltCues = [];
  };

  const prepareAltCuesList = () => {
    console.log("Preparing alt cues list");

    indexedAltCues = [];

    if (!parsedAltSrtCues.length) {
      console.error("There is no parsed cues");

      return;
    }

    let videos = document.body.getElementsByTagName("video");
    let video = videos[0];

    const videoTextTrack = findActiveVideoTextTrack(video);

    console.log(
      "Video text track cues",
      videoTextTrack.cues,
      "count",
      videoTextTrack.cues.length,
    );

    if (!videoTextTrack || !videoTextTrack.cues) {
      console.log("There is no video text track");

      return;
    }

    let cues = Array.from(videoTextTrack.cues);

    console.log(
      "Filling alt cues",
      parsedAltSrtCues,
      "cues from video",
      cues.length,
    );

    // Creating for each video text track cue alternative
    // cues from parsed cues list
    for (let i = 0; i < cues.length; i++) {
      let maxCommonArea = 0;
      let maxCommonAreaJ = -1;

      for (let j = 0; j < parsedAltSrtCues.length; j++) {
        let parsedCue = parsedAltSrtCues[j];
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
        indexedAltCues.push(
          parsedAltSrtCues[maxCommonAreaJ].text.replace(/\n/g, " "),
        );
      } else {
        indexedAltCues.push("");
      }
    }
  };

  const clearCurrentCues = () => {
    altPlayerSubtitlesConfig = null;
    parsedAltSrtCues = [];
  };

  const stepReplica = (i: number) => {
    let videos = document.body.getElementsByTagName("video");
    let video = videos[0];

    if (
      !video ||
      !video.textTracks.length ||
      !findActiveVideoTextTrack(video).cues
    )
      return;

    let cues = Array.from(findActiveVideoTextTrack(video).cues);

    if (cues.length) {
      let activeCues = findActiveVideoTextTrack(video).activeCues;
      if (activeCues.length) {
        let activeCue = activeCues[0];
        let activeCuesIndex = cues.indexOf(activeCue);
        if (activeCuesIndex != -1) {
          let newReplicaIndex: number = 0;
          if (i < 0) {
            // Find the cue before the current video time
            // But if the time delta too short, then go to the previous cue
            let currentTime = video.currentTime;
            for (let i = 0; i < cues.length; i++) {
              let cue = cues[i];

              if (cue.startTime < currentTime) {
                newReplicaIndex = i;
              } else {
                break;
              }
            }

            let newCue = cues[newReplicaIndex];
            let cueLength = newCue.endTime - newCue.startTime;
            let timeDelta = currentTime - newCue.startTime;
            if (timeDelta < cueLength / 3 && newReplicaIndex > 0) {
              newReplicaIndex = newReplicaIndex - 1;
            }
          } else {
            newReplicaIndex = activeCuesIndex + i;
            if (newReplicaIndex >= cues.length) {
              newReplicaIndex = cues.length;
            } else if (newReplicaIndex < 0) {
              newReplicaIndex = 0;
            }
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

  const pauseVideo = () => {
    const video = getVideo();
    if (!video) return;

    videoPausedByExtension = true;
    video.pause();
  };

  const playVideo = () => {
    const video = getVideo();
    if (!video) return;

    videoPausedByExtension = false;
    video.play();
  };

  const getVideo = () =>
    document.querySelector("video") as HTMLVideoElement | null;

  const onMouseLeftSubtitles = () => {
    if (videoPausedByExtension) {
      const selection = window.getSelection();
      if (selection && selection.toString()) return;
      playVideo();
    }
  };

  const onMouseJoinSubtitles = () => {
    const video = getVideo();
    if (video && video.paused) return;
    pauseVideo();
  };

  let checkSubtitlesPortalElementInterval: NodeJS.Timeout;

  onMount(() => {
    checkSubtitlesPortalElementInterval = setInterval(() => {
      let newSubtitlesPortalElem: HTMLElement = document.querySelector(
        `[data-tid="SubtitlesPortalRoot"]`,
      );

      if (
        !subtitlesPortalElement ||
        subtitlesPortalElement !== newSubtitlesPortalElem
      ) {
        subtitlesPortalElement = newSubtitlesPortalElem;
      }
    }, 100);
  });

  onDestroy(() => {
    clearInterval(checkSubtitlesPortalElementInterval);
  });

  // Check toggle
  $: enabled = $settings.doublesubs_enabled;

  $: {
    if (subtitlesPortalElement && windowCuesElement) {
      console.log(
        "Adding window cues into subtitles portal",
        "portal",
        subtitlesPortalElement,
      );
      subtitlesPortalElement.appendChild(windowCuesElement);
    }
  }

  $: {
    if (enabled) {
      clearInterval(checkPageUrlChangeInterval);
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
    if (altPlayerSubtitlesConfig) {
      updateSubtitles();
    }
  }

  // Change rendering cues
  $: {
    if (parsedAltSrtCues) {
      console.log("New parsed cues", parsedAltSrtCues);
      clearInterval(checkVideoExistingInterval);

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
          handleChangeVideoTracks,
        );

        videos[0].removeEventListener("play", handleChangeVideoState);
        videos[0].removeEventListener("pause", handleChangeVideoState);

        videos[0].textTracks.addEventListener(
          "change",
          handleChangeVideoTracks,
        );

        videos[0].addEventListener("play", handleChangeVideoState);
        videos[0].addEventListener("pause", handleChangeVideoState);

        videoPaused = videos[0].paused;
        handleChangeVideoTracks();
      }, CHECK_INTERVAL_TIME);
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
    if ($settings.hightlight_primary_cue_enabled) {
      document.body.classList.add(activeHighlightClass);
    } else {
      document.body.classList.remove(activeHighlightClass);
    }
  }

  // This function checks whether language changed by radio button or not
  const handleDomChangeLanguage = (e: MouseEvent) => {
    let el = e.target as HTMLElement;
    if (el && el.getAttribute("type") === "radio") {
      console.log("Clicked on new language radio", "el", el);
      let val = el.getAttribute("value");
      if (!Object.values(CogType).includes(val as CogType)) {
        // If some cog has already been opened, then we need to check the value
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

  $: console.log("Parsed active cues", parsedAltSrtCues);
  $: console.log("Current alt cues", indexedAltCues);
  $: console.log(
    "Current cue index",
    currentPrimaryCueIndex,
    "alt cue",
    indexedAltCues[currentPrimaryCueIndex],
  );
  $: console.log("Current watch params", watchParams);
  $: console.log("Current primary cue text", currentPrimaryCueText);
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
  <div
    bind:this={windowCuesElement}
    class="
        extension--cues {videoPaused ? 'kplayer--paused' : ''}
        {$settings.selectable_primary_cue_enabled
      ? 'kinopoisk-dualsubs--enable-selectable-primary-cue'
      : ''}
      "
  >
    <div
      on:mousemove={() =>
        $settings.selectable_primary_cue_enabled
          ? onMouseJoinSubtitles()
          : false}
      on:mouseleave={() =>
        $settings.selectable_primary_cue_enabled
          ? onMouseLeftSubtitles()
          : false}
      class="extension--cues-window"
    >
      {#if currentPrimaryCueText}
        <div
          class="extension--cue-line extension--primary-cue {indexedAltCues.length
            ? ''
            : 'no-highlight'}"
        >
          {@html currentPrimaryCueText.replaceAll("\n", "<br/>")}
        </div>
      {/if}
      {#if currentPrimaryCueIndex != null && indexedAltCues[currentPrimaryCueIndex]}
        <div class="extension--cue-line extension--alternative-cue">
          {@html indexedAltCues[currentPrimaryCueIndex]}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  :global(
      .kinopoisk-dualsubs--enabled
        [data-tid="SubtitlesPortalRoot"]
        [data-tid="Subtitles"]
    ) {
    @apply opacity-0;
  }

  :global(.extension--cues) {
    @apply fixed flex z-2 flex-col text-shadow-md shadow-black  px-4  w-full bottom-0 text-white text-4xl justify-center items-center;
  }

  :global(.extension--cues *::selection) {
    @apply bg-yellow-300 text-true-gray-900;
  }

  :global(.extension--cues-window) {
    @apply inline-flex flex-col justify-center items-center;
  }

  :global(.extension--cue-line) {
    @apply inline-block p-4 px-8 text-center w-full;
  }

  :global(.extension--cue-line.extension--alternative-cue) {
    @apply pt-2 pb-6 text-4xl text-true-gray-300 select-none pointer-events-none transition-all ease-out duration-200;
  }

  :global(.kplayer--paused .extension--cue-line.extension--alternative-cue) {
    @apply text-true-gray-100;
  }

  :global(.kinopoisk-dualsubs--enable-dark-bg .extension--cues-window) {
    @apply bg-black/75 rounded-lg overflow-hidden;
  }

  :global(.extension--primary-cue) {
    @apply text-5xl font-semibold cursor-default select-none;
  }

  :global(
      .kinopoisk-dualsubs--enable-selectable-primary-cue .extension--primary-cue
    ) {
    @apply cursor-text select-text;
  }

  :global(
      .kinopoisk-dualsubs--enable-highlight-primary-cue .extension--primary-cue
    ) {
    @apply !text-yellow-300;
  }

  :global(.extension--primary-cue.no-highlight) {
    @apply !text-white font-normal;
  }
</style>
