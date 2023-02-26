import type { GetMetadataRequest, RuntimeMessage } from "src/background/sw";
import Browser from "webextension-polyfill";

export const getContentMetadata = async (filmId:string):Promise<any> => {
	const msg = {
      event: "ott:get_metadata",
      data: {
        filmId: filmId,
      } as GetMetadataRequest,
    } as RuntimeMessage;
  
    const result = await Browser.runtime.sendMessage("", msg);
    return result;
}

export const getWatchParams = async (filmId: string):Promise<any> => {
	const msg = {
		event: "ott:get_watchparams",
		data: {
		filmId: filmId,
		},
	} as RuntimeMessage
	return Browser.runtime.sendMessage("", msg)
}

export const getContentStreamsMetadata = async (contentId: string):Promise<any> => {
	const msg = {
		event: "ott:get_content_streams_metadata",
		data: {
			contentId,
		},
	} as RuntimeMessage
	return Browser.runtime.sendMessage("", msg);
}

export const getContentChildren = async (contentId: string):Promise<any> => {
	const msg = {
		event: "ott:get_content_children",
		data: {
			contentId,
		},
	} as RuntimeMessage;
	return Browser.runtime.sendMessage("", msg);
}