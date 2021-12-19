const API_ENDPOINT = "https://api.ott.kinopoisk.ru/v12/hd/";

export const call = async (path:string) => {
  let res = await fetch(API_ENDPOINT + path, {
    credentials: "include",
  });
  let resJson = await res.json()
  return resJson;
}

export const getWatchParams = async (filmId:string) => {
  return call("watch-params/" + filmId);
}

export const getContentMetadata = async (filmId:string) => {
  return call("/content/" + filmId +"/metadata");
}

export const getContentChildren = async (filmId:string) => {
  return call("/content/" + filmId + "/children");
}

export const getContentStreamsMetadata = async (contentId:string) => {
  return call("/content/" + contentId + "/streams/metadata?serviceId=25");
}
