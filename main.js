const API_ENDPOINT = "https://api.ott.kinopoisk.ru/v12/hd/";
const altCueClass = "extention--alternative-cue";

const altCueRegExp = new RegExp(`<span class="${altCueClass}">`)

let LANGAUGES = {
  RUS: "rus",
  ENG: "eng"
}

let state = {
  watchParams: {},
  contentInfo: {},
  currentPageUrl: "",
  renderingSubtitles: {},
  videoWaitInterval: 0,
  videoWaitCuesInterval: 0,
  parsedSubs: "",
}

let apiCache = {};
let subsCache = {};

const setNewState = (st) => {
  let changed = st.contentInfo && JSON.stringify(state.contentInfo) != JSON.stringify(st.contentInfo);
  let changedWatchParams = st.watchParams && st.watchParams.subtitleLanguage != state.watchParams.subtitleLanguage;
  let changedSubtitles = st.renderingSubtitles && JSON.stringify(st.renderingSubtitles) != JSON.stringify(state.renderingSubtitles)
  state = {
    ...state,
    ...st
  }
  if (changed) {
    updateVideoSubtitles();
  }

  if (changedWatchParams) {
    reloadSubtitles();
  }

  if (changedSubtitles) {
    setNewSubtitles();
  }
}

const updateVideoSubtitles = async () => {
  if (!state.contentInfo.filmId) return;
  let watchParams = await apiCall("watch-params/" + state.contentInfo.filmId);
  setNewState({
    watchParams: watchParams
  });
  if (!state.watchParams.subtitleLanguage) return;
  console.log("Need update video subtitles!", state)
  await reloadSubtitles();
}

const reloadSubtitles = async () => {
  let metadata = await apiCall("/content/" + state.contentInfo.filmId + "/metadata");
  let contentId = state.contentInfo.filmId;
  console.log("Metadata", metadata);
  if (metadata.contentType === "tv-series") {
    // Загружаем информацию о сериале
    let tv = await apiCall("/content/" + state.contentInfo.filmId + "/children");
    console.log("Loaded TV", tv);
    if (!state.contentInfo.seasonNumber || !state.contentInfo.episodeNumber) return;
    contentId = tv.seasons[state.contentInfo.seasonNumber - 1].episodes[state.contentInfo.episodeNumber - 1];
    contentId = contentId ? contentId.filmId : "";
    console.log("With opened episode id", contentId);
  }
  console.log("ContentID", contentId);
  if (!contentId) return;
  let streamsMetadata = await apiCall("/content/" + contentId + "/streams/metadata?serviceId=25")
  console.log("WatchParams", state.watchParams)
  let subs = streamsMetadata.streams[0].subtitles.find((sub) => {
    return sub.language === LANGAUGES.RUS && state.watchParams.subtitleLanguage === LANGAUGES.ENG || sub.language === LANGAUGES.ENG && state.watchParams.subtitleLanguage === LANGAUGES.RUS;
  });
  if (!subs) return;
  console.log("Alternative subtitles selected", subs);
  setNewState({
    renderingSubtitles: subs
  });
}

function onChangeTracks () {
  clearInterval(state.videoWaitCuesInterval);
  let videoWaitCuesInterval = setInterval(() => {
    let video = document.querySelector("video");
    if (video && video.textTracks[0] && video.textTracks[0].cues && video.textTracks[0].cues.length) {
      clearInterval(videoWaitCuesInterval);
      fillAlternativeCues();
    }
  }, 100);
  setNewState({
    videoWaitCuesInterval
  });
}

function fillAlternativeCues () {
  console.log("Fill alternatives");
  let video = document.querySelector("video");

  let cues = Array.from(video.textTracks[0].cues);
  let notFilled = [];
  let fillWith = [];

  cues.forEach((cue, cueIndex) => {
    let alternativeCue = "";
    state.parsedSubs.forEach((el) => {
      if (Math.abs(cue.startTime - (el.startTime/1000)) <= 2) {
        alternativeCue = el.text;
      }
    });

    if (alternativeCue) {
      fillWith.push(alternativeCue);
      if (!video.textTracks[0].cues[cueIndex].text.match(altCueRegExp)) {
        video.textTracks[0].cues[cueIndex].text += `<span class="${altCueClass}">${alternativeCue.replace(/\n/g, " ")}</span>`;
      }
    } else {
      notFilled.push(cueIndex);
      fillWith.push(null);
    }
  });

  notFilled.forEach((notFilledIndex) => {
    let prevSubs = fillWith[notFilledIndex - 1]
    if (prevSubs) {
      let prevSubsReplics = prevSubs.split('\n');
      let text = prevSubsReplics[prevSubsReplics.length - 1];
      if (!video.textTracks[0].cues[notFilledIndex].text.match(altCueRegExp)) {
        video.textTracks[0].cues[notFilledIndex].text += `<span class="extention--alternative-cue">${text}</span>`;
      }
    }
  });
}

const setNewSubtitles = async () => {
  let subtitlesRaw = await getSubtitlesBody(state.renderingSubtitles.url);
  if (!subtitlesRaw) return;
  if (state.videoWaitInterval) clearInterval(state.videoWaitInterval);
  let parsedSubs = parser.fromSrt(subtitlesRaw, true);
  
  setNewState({
    parsedSubs
  })

  console.log("Parsed subs", parsedSubs);

  let videoWaitInterval = setInterval(() => {
    let video = document.querySelector("video");
    if (!video || (video && !video.textTracks) || (!video.textTracks.length)) return;
    clearInterval(videoWaitInterval);
    console.log("Loaded video with tracks!", video.textTracks);
    if (video.textTracks[0].cues && video.textTracks[0].cues.length) onChangeTracks();
    video.textTracks.removeEventListener("change", onChangeTracks);
    video.textTracks.addEventListener("change", onChangeTracks);
  }, 100);
  
  setNewState({
    videoWaitInterval
  });
}

const getSubtitlesBody = async (url) => {
  if (subsCache[url]) return subsCache[url];
  let res = await fetch(url, {
    credentials: "include"
  });
  res = await res.text();
  subsCache[url] = res;
  return res;
}

/**
 * Загружает текущее состояние настроек видеоплеера
 */
const updateState = async () => {
  // Делаем запрос на watch-params
  setNewState({
    contentInfo: getCurrentContentIfromation()
  });
}

const apiCall = async (path) => {
  if (apiCache[path]) return apiCache[path];
  let res = await fetch(API_ENDPOINT + path, {
    credentials: "include",
  });
  res = await res.json()
  apiCache[path] = res;
  return res;
}

/**
 * Возвращает информацию о текущем контенте. Фильм, сериал, эпизод, сезон.
 */
const getCurrentContentIfromation = () => {
  let currentLocation = document.location.pathname.split('/');
  let params = new URLSearchParams(document.location.search);
  let episodeNumber = +params.get("episode");
  let seasonNumber = +params.get("season");
  return {
    episodeNumber: isNaN(episodeNumber) ? 0 : episodeNumber,
    seasonNumber: isNaN(seasonNumber) ? 0 : seasonNumber,
    filmId: params.get("rt") || currentLocation[2] || "",
  }
}

document.addEventListener("click", function (e) {
  if (e.target && e.target.getAttribute("type") === "radio") {
    if (e.target.getAttribute("value").includes("subtitles")) {
      let watchParams = state.watchParams;
      setNewState({
        watchParams: {
          ...watchParams,
          subtitleLanguage: e.target.getAttribute("value").split("/")[1]
        }
      })
    }
  }
});

setInterval(() => {
  if (state.currentPageUrl !== document.location.href) {
    state.currentPageUrl = document.location.href;
    updateState();
  }
}, 500);

const parser = (function () {
  let pItems = {};
  pItems.fromSrt = function (data, useMs=false) {
    data = data.replace(/\r/g, '');
    let regex = /(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/g;
    data = data.split(regex);
    data.shift();

    let items = [];
    for (let i = 0; i < data.length; i += 4) {
      items.push({
        id: data[i].trim(),
        startTime: useMs ? timeMs(data[i + 1].trim()) : data[i + 1].trim(),
        endTime: useMs ? timeMs(data[i + 2].trim()) : data[i + 2].trim(),
        text: data[i + 3].trim()
      });
    }

    return items;
  };

  let timeMs = function (val) {
    let regex = /(\d+):(\d{2}):(\d{2}),(\d{3})/;
    let parts = regex.exec(val);

    if (parts === null) {
      return 0;
    }

    for (let i = 1; i < 5; i++) {
      parts[i] = parseInt(parts[i], 10);
      if (isNaN(parts[i])) parts[i] = 0;
    }

    return parts[1] * 3600000 + parts[2] * 60000 + parts[3] * 1000 + parts[4];
  };

  return pItems;
})();

