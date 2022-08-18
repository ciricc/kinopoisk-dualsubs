<script lang="ts">

  import { getContentChildren, getContentMetadata, getContentStreamsMetadata, getWatchParams } from "../../lib/KinopoiskOTTApi";
  import type { PlayerContentInformation, PlayerSubtitles, PlayerWatchParams } from "../../types";
  import { onDestroy } from "svelte";
  import { settings } from "../stores/settings";
  import { Cue, srtParser } from "../../lib/srtParser";

  const LANGAUGES = {
    RUS: "rus",
    ENG: "eng",
  }
  
  const MAX_INTERVAL_WORK_TIME = 30000; // ms
  const CHECK_INTERVAL_TIME = 200;

  const activeBlackBgClass = "kinopoisk-dualsubs--enable-dark-bg";
  const activeHighlightClass = "kinopoisk-dualsubs--enable-highlight-primary-cue";
  const activeExtensionClass = "kinopoisk-dualsubs--enabled";

  let cachedSubtiles:Record<string, string> = {};
  let pageUrl:string = document.location.href;
  let originalCuesPositionBottom = 0;
  
  let contentInfo:PlayerContentInformation = {
    season: 0,
    episode: 0,
    filmId: "",
  }
  
  let watchParams:PlayerWatchParams = {
    subtitleLanguage: ""
  };

  let renderingSubtitles:PlayerSubtitles;

  let checkPageUrlChangeInterval:NodeJS.Timeout;
  let checkVideoExistingInterval:NodeJS.Timeout;
  let checkVideoCuesInterval:NodeJS.Timeout;
  let checkOriginalSubtitlesYPositionInterval:NodeJS.Timeout;

  let parsedCues:Cue[] = [];
  let enabled:boolean = false;
  let currentAltCues:string[] = [];
  let currentCueIndex:null|number = null;
  let currentPrimaryCueText = "";

  const getContentInformation = ():PlayerContentInformation => {
    let currentLocation = document.location.pathname.split('/');
    let params = new URLSearchParams(document.location.search);
    let episodeNumber = +params.get("episode");
    let seasonNumber = +params.get("season");
    return {
      episode: isNaN(episodeNumber) ? 0 : episodeNumber,
      season: isNaN(seasonNumber) ? 0 : seasonNumber,
      filmId: params.get("rt") || currentLocation[2] || "",
    }
  }

  const updateWatchParams = async () => {
    watchParams = await getWatchParams(contentInfo.filmId);
  }

  const loadContentSubtitles = async () => {
    let metadata = await getContentMetadata(contentInfo.filmId);
    let contentId = contentInfo.filmId;

    if (metadata.contentType === "tv-series" && (contentInfo.season && contentInfo.episode)) {
      let tv = await getContentChildren(contentId);
      let episode = tv.seasons[contentInfo.season - 1].episodes[contentInfo.episode - 1];
      contentId = contentId ? episode.filmId as string : "";
    }
    
    if (!contentId) return;
    
    let streamsMetadata = await getContentStreamsMetadata(contentId);
    
    if (watchParams.subtitleLanguage.startsWith("sid")) {
      let index = parseInt(watchParams.subtitleLanguage.replace("sid", ""))
      if (streamsMetadata.streams[0].subtitles[index]) {
        watchParams.subtitleLanguage = streamsMetadata.streams[0].subtitles[index].language
      }
    }

    let subs = streamsMetadata.streams[0].subtitles.find((sub) => {
      return sub.language === LANGAUGES.RUS && watchParams.subtitleLanguage === LANGAUGES.ENG || sub.language === LANGAUGES.ENG && watchParams.subtitleLanguage === LANGAUGES.RUS;
    });

    if (subs) {
      renderingSubtitles = subs;
    }
  }

  const handleDomChangeLanguage = (e:MouseEvent) => {
    let el = e.target as HTMLElement;
    if (el && el.getAttribute("type") === "radio") {
      let val = el.getAttribute("value")
      if (val.includes("subtitles") || val.includes("sid")) {
        if (val.includes("sid")) {
          watchParams.subtitleLanguage = val
        } else {
          watchParams.subtitleLanguage = el.getAttribute("value").split("/")[1]
        }
      }
    }
  }

  const loadSubtitles = async (path:string) => {
    if (cachedSubtiles[path]) return cachedSubtiles[path];
    let body = await fetch(path, {
      credentials: "include"
    })
    let subs = await body.text();
    cachedSubtiles[path] = subs;
    return subs;
  }

  const updateSubtitles = async () => {
    let subs = await loadSubtitles(renderingSubtitles.url);
    if (!subs) return;
    parsedCues = srtParser(subs);
  }

  const changeCueHandler = (e:Event) => {
    const track = e.target as TextTrack;
    if (track.activeCues.length) {
      const activeCue = track.activeCues[0] as VTTCue;
      currentPrimaryCueText = activeCue.text;
      const primaryCueIndex = Array.from(track.cues).indexOf(activeCue);
      if (primaryCueIndex !== -1) {
        currentCueIndex = primaryCueIndex;
        currentPrimaryCueText = activeCue.text;
        return
      }
    }
    currentCueIndex = null;
    currentPrimaryCueText = "";
  }

  const handleChangeVideoTracks = () => {
    clearInterval(checkVideoCuesInterval);
    let intervalStart = Date.now()
    
    const checkCues = () => {
      if (Date.now() - intervalStart >= MAX_INTERVAL_WORK_TIME) clearInterval(checkVideoCuesInterval);
      
      let videos = document.body.getElementsByTagName("video");
      
      if (videos.length && videos[0].textTracks && videos[0].textTracks.length && videos[0].textTracks[0].cues && videos[0].textTracks[0].cues.length) {
        clearInterval(checkVideoCuesInterval);
        fillAltCues();
        videos[0].textTracks[0].addEventListener("cuechange", changeCueHandler);
      }
    }

    checkVideoCuesInterval = setInterval(() => {
      checkCues()
    }, CHECK_INTERVAL_TIME);
    checkCues()
  }

  const fillAltCues = () => {
    currentAltCues = [];
    let videos = document.body.getElementsByTagName("video");
    let video = videos[0];
    let cues = Array.from(video.textTracks[0].cues);
    
    for (let i = 0; i < cues.length; i++) {
        let cue = cues[i];
        let foundAltCuesPotential = [];
        let altCueI = 0;

        while (true) {
            if (altCueI >= parsedCues.length) break;
            let altCue = parsedCues[altCueI];
            let altCueStartTime = altCue.startTime / 1000;
            let altCueEndTime = altCue.endTime / 1000;

            if ((altCueEndTime >= cue.startTime && altCueStartTime <= cue.endTime)) {
              foundAltCuesPotential.push(altCue);
            }
            altCueI++;
        }
        
        foundAltCuesPotential = foundAltCuesPotential.map(p => p.text);
        if (foundAltCuesPotential.length) {
          currentAltCues.push(foundAltCuesPotential.join("\n").replace(/\n/g, " "));
        } else {
          currentAltCues.push("");
        }
    }
  }

  const clearCurrentCues = () => {
    renderingSubtitles=null;
    parsedCues = [];
  }

  const stopIntervals = () => {
    clearInterval(checkPageUrlChangeInterval);
    clearInterval(checkVideoCuesInterval);
    clearInterval(checkVideoExistingInterval);
    clearInterval(checkOriginalSubtitlesYPositionInterval);
  }

  // Check toggle
  $: enabled = $settings.doublesubs_enabled;
  $: {
    if (enabled) {
      clearInterval(checkPageUrlChangeInterval);
      clearInterval(checkOriginalSubtitlesYPositionInterval);
      
      checkOriginalSubtitlesYPositionInterval = setInterval(() => {
        const elem = document.querySelector(`[class*="Subtitles_root"]`)
        if (elem) {
          const originalCuesRect = elem.getBoundingClientRect();
          originalCuesPositionBottom = window.innerHeight - (originalCuesRect.y + originalCuesRect.height);
        }
      }, 50);

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
    if (contentInfo && contentInfo.filmId) { // when updates film
      clearCurrentCues()
      updateWatchParams();
    }
  }

  // Change watch params
  $: {
    if (watchParams && watchParams.subtitleLanguage && enabled) { // when changes subtitle language
      loadContentSubtitles();
    } else {
      clearCurrentCues();
    }
  }

  // Change active subtitles
  $: {
    if (renderingSubtitles) {
      // originalCues=[];
      updateSubtitles();
    }
  }

  // Change rendering cues
  $: {
    if (parsedCues) {
      clearInterval(checkVideoExistingInterval);
      if (parsedCues.length) {
        let intervalStart = Date.now();
        checkVideoExistingInterval = setInterval(() => {
          let videos = document.body.getElementsByTagName("video");
          
          if (!videos.length || !videos[0].textTracks || !videos[0].textTracks.length) {
            if (Date.now() - intervalStart >= MAX_INTERVAL_WORK_TIME) clearInterval(checkVideoExistingInterval);
            return;
          }
          
          clearInterval(checkVideoExistingInterval);

          videos[0].textTracks.removeEventListener("change", handleChangeVideoTracks);
          videos[0].textTracks.addEventListener("change", handleChangeVideoTracks);
          
          handleChangeVideoTracks();

        }, CHECK_INTERVAL_TIME);
      }
    }
  }

  $: {
    if ($settings.black_background_enabled) {
      document.body.classList.add(activeBlackBgClass)
    } else {
      document.body.classList.remove(activeBlackBgClass);
    }
  }

  $: {
    if ($settings.hightlight_primary_cue_enabled) {
      document.body.classList.add(activeHighlightClass)
    } else {
      document.body.classList.remove(activeHighlightClass);
    }
  }

  onDestroy(() => {
    stopIntervals();
  });

</script>

<svelte:body on:click={handleDomChangeLanguage} />
{#if enabled}
  {#if currentCueIndex != null && originalCuesPositionBottom}
    <div class="extension--cues" style="transform: translateY(-{originalCuesPositionBottom}px);">
      {#if currentPrimaryCueText}
        <div class="extension--cue-line extension--primary-cue">
          {@html currentPrimaryCueText.replaceAll("\n", "<br/>")}
        </div>
      {/if}
      {#if currentAltCues[currentCueIndex]}
        <div class="extension--cue-line extension--alternative-cue">
          {@html currentAltCues[currentCueIndex]}
        </div>
      {/if}
    </div>
  {/if}
{/if}

<style>
  :global(.kinopoisk-dualsubs--enabled [class*="Subtitles_root"] [class*="Subtitles_text"]) {
    @apply opacity-0;
  }

  :global(.kinopoisk-dualsubs--enabled [class*="PlayerSkin_layout"] [class*="Layout_bottom"]) {
    @apply z-2;
  }

  :global(.extension--cues) {
    @apply fixed flex flex-col px-4 text-shadow-xl shadow-black select-none transition-transform transform-gpu pointer-events-none w-full bottom-0 text-white text-4xl justify-center items-center;
  }

  :global(.extension--cue-line) {
    @apply inline-block p-4 text-center;
  }

  :global(.kinopoisk-dualsubs--enable-dark-bg .extension--cue-line) {
    @apply bg-black/80;
  }

  :global(.extension--primary-cue) {
    @apply text-5xl font-semibold;
  }

  :global(.kinopoisk-dualsubs--enable-highlight-primary-cue
      .extension--primary-cue) {
    @apply !text-yellow-300;
  }
</style>
