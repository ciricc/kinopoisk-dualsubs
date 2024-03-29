const API_ENDPOINT = "https://api.ott.kinopoisk.ru/v12/hd/";

export const call = async (path:string) => {
  const res = await fetch(API_ENDPOINT + path, {
    credentials: "include",
  });
  return await res.json();
}

export const getWatchParams = async (filmId:string) => {
  return call("watch-params/" + filmId + "?serviceId=25");
}

export const getContentMetadata = async (filmId:string) => {
  return call("content/" + filmId +"/metadata?serviceId=25");
}

export const getContentChildren = async (filmId:string) => {
  return call("content/" + filmId + "/children?serviceId=25");
}

export const getContentStreamsMetadata = async (contentId:string) => {
  return call("content/" + contentId + "/streams/metadata?serviceId=25");
}
