export type Cue = {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export const srtParser = (function () {
  let timeMs = function (val: string): number {


    let timeAndMs = val.split(/([\d|:]+)(,|\.)(\d{3})/)
    let msVal = parseInt(timeAndMs[3]);

    let timeVal = timeAndMs[1].split(':');

    let seconds = parseInt(timeVal[timeVal.length - 1]);
    msVal += (seconds * 1000);

    if (timeVal.length >= 2) {
      let minutes = parseInt(timeVal[timeVal.length - 2]);
      msVal += (minutes * 60 * 1000);
    }

    if (timeVal.length >= 3) {
      let hours = parseInt(timeVal[timeVal.length - 3]);
      msVal += hours * 60 * 60 * 1000;
    }

    return msVal
  };

  return function (data: string): Cue[] {
    data = data.replace(/\r/g, "")

    if (data.startsWith("WEBVTT")) {
      data = data.replace(/WEBVTT\n?/g, "")
    } else {
      data = data.replace(/\n$/g, "")
    }

    /*
    [0] - id (title)
    [1] - time (d:d:d.ddd --> d:d:d.ddd)
    [2...\n] - replics to double \n
    */
    let dataRows = data.split('\n')
    dataRows.shift();

    let cues: Cue[] = [];
    let lastCue: Cue = {
      id: "",
      startTime: 0,
      endTime: 0,
      text: ""
    }

    let i = dataRows.length;
    while (true) {
      if (dataRows[i] == "") { // end of current cue
        let replicaEndI = i;

        while (true) {
          i--
          if (i < 0 || dataRows[i] == "") {
            i++
            break
          }
        }

        let id = dataRows[i]
        let timeLine = dataRows[i + 1];

        let idLineIsTimeLine = id.match(/-->/g);
        let timeLineIndex = i + 1;

        if (idLineIsTimeLine) {
          timeLine = id
          id = "";
          timeLineIndex = i;
        }

        lastCue.id = id;

        let timeLineCols = timeLine.split(' --> ')

        lastCue.startTime = timeMs(timeLineCols[0].trim())
        lastCue.endTime = timeMs(timeLineCols[1].trim())
        lastCue.text = dataRows.slice(timeLineIndex + 1, replicaEndI).join("\n");
        cues.push({
          ...lastCue
        })
      }

      if (i <= 0) {
        break
      }
      i--;
    }

    cues = cues.reverse()
    return cues
  }
})();