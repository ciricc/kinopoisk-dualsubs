<script lang="ts">
  import { getContentChildren, getContentMetadata, getContentStreamsMetadata, getWatchParams } from "../../lib/KinopoiskOTTApi";
  import type { PlayerContentInformation, PlayerSubtitles, PlayerWatchParams } from "../../types";
  import { onDestroy } from "svelte";
  import { settings } from "../stores/settings";
  import { Cue, srtParser } from "../../lib/srtParser";

  const LANGAUGES = {
    RUS: "rus",
    ENG: "eng"
  }

  const MAX_INTERVAL_WORK_TIME = 30000; // ms
  const CHECK_INTERVAL_TIME = 200;

  const altCueClass = "extention--alternative-cue";
  const altCueRegExp = new RegExp(`<span class="${altCueClass}">`);
  const activeBlackBgClass = "kinopoisk-dualsubs--enable-dark-bg";

  let cachedSubtiles:Record<string, string> = {};
  let pageUrl:string = document.location.href;
  
  let contentInfo:PlayerContentInformation = {
    season: 0,
    episode: 0,
    filmId: ""
  }
  
  let watchParams:PlayerWatchParams = {
    subtitleLanguage: ""
  };

  let renderingSubtitles:PlayerSubtitles;

  let checkPageUrlChangeInterval:NodeJS.Timeout;
  let checkVideoExistingInterval:NodeJS.Timeout;
  let checkVideoCuesInterval:NodeJS.Timeout;

  let parsedCues:Cue[] = [];
  let originalCues:string[] = [];
  let enabled:boolean = false;

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
    console.log("parsed cues", parsedCues);
  }

  const handleChangeVideoTracks = () => {
    clearInterval(checkVideoCuesInterval);
    let intervalStart = Date.now()
    checkVideoCuesInterval = setInterval(() => {
      if (Date.now() - intervalStart >= MAX_INTERVAL_WORK_TIME) clearInterval(checkVideoCuesInterval);
      
      let videos = document.body.getElementsByTagName("video");
      
      if (videos.length && videos[0].textTracks && videos[0].textTracks.length && videos[0].textTracks[0].cues && videos[0].textTracks[0].cues.length) {
        clearInterval(checkVideoCuesInterval);
        fillAltCues();
      }

    }, CHECK_INTERVAL_TIME);
  }

  const fillAltCues = () => {
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
        
        if (foundAltCuesPotential.length >= 2) {
            let altCuesAreasPercentages = foundAltCuesPotential.map(altCue => {
                let timeArea = altCue.endTime - cue.startTime;
                if (altCue.endTime > cue.endTime) {
                    timeArea = cue.endTime - altCue.startTime;
                }
                return timeArea/(cue.endTime - cue.startTime) * 100;
            });

            let maxPercentageThreshold = 100 / (altCuesAreasPercentages.length);
            let concurrentPercentageThreashold = (maxPercentageThreshold) * (60/50);
            foundAltCuesPotential = foundAltCuesPotential.map((v, i) => {
                if (altCuesAreasPercentages[i] < concurrentPercentageThreashold) return null;
                return v
            }).filter(v => v)
        }

        foundAltCuesPotential = foundAltCuesPotential.map(p => p.text);
        if (foundAltCuesPotential.length) {
          let currentCue = video.textTracks[0].cues[i] as any
          if (!currentCue.text.match(altCueRegExp)) {
            currentCue.text += `<span class="${altCueClass}">${foundAltCuesPotential.join("\n").replace(/\n/g, " ")}</span>`;
          }
        }
    }
  }

  const clearCurrentCues = () => {
    renderingSubtitles=null;
    parsedCues = [];
    originalCues = [];
  }

  const stopIntervals = () => {
    clearInterval(checkPageUrlChangeInterval);
    clearInterval(checkVideoCuesInterval);
    clearInterval(checkVideoExistingInterval);
  }

  // Check toggle
  $: enabled = $settings.doublesubs_enabled;
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
    if (!enabled) {
      stopIntervals();
      // Return original cues when disabling
      let videos = document.body.getElementsByTagName("video");
      if (originalCues.length && videos.length && videos[0].textTracks.length && videos[0].textTracks[0].cues.length) {  
        videos[0].textTracks.removeEventListener("change", handleChangeVideoTracks);
        
        originalCues.forEach((cue, i) => {
          (videos[0].textTracks[0].cues[i] as any).text = String(cue);
        });

      }
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
      originalCues=[];
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
          if (videos[0].textTracks[0].cues && videos[0].textTracks[0].cues.length) handleChangeVideoTracks();
          
          videos[0].textTracks.removeEventListener("change", handleChangeVideoTracks);
          videos[0].textTracks.addEventListener("change", handleChangeVideoTracks);

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

  onDestroy(() => {
    stopIntervals();
  });

</script>

<svelte:body on:click={handleDomChangeLanguage}></svelte:body>

<style>
  :global([class*="Subtitles__root"]){
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    flex-wrap: nowrap;
  }

  :global(.extention--alternative-cue){
    display: block;
    font-size: 2.2rem;
  }

  :global(.kinopoisk-dualsubs--enable-dark-bg [class*="Subtitles__text"]) {
    background-color: rgba(0, 0, 0, .78);
    font-size: 3rem;
    display: inline-block;
    width: max-content;
    padding: 2px 28px;
  }

</style>