export type Cue = {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}
export const srtParser = (function () {
  let timeMs = function (val:string):number {
    let regex = /(\d+):(\d{2}):(\d{2}),(\d{3})/;
    let parts = regex.exec(val);
    let parsetNum:number[] = [];
    if (parts === null) {
      return 0;
    }
    for (let i = 1; i < 5; i++) {
      parsetNum[i] = parseInt(parts[i], 10);
      if (isNaN(parsetNum[i])) parsetNum[i] = 0;
    }
    return parsetNum[1] * 3600000 + parsetNum[2] * 60000 + parsetNum[3] * 1000 + parsetNum[4];
  };

  return function (data:string) {
    data = data.replace(/\r/g, '');
    let regex = /(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/g;
    let dataRows = data.split(regex);
    dataRows.shift();
    let items:Cue[] = [];
    for (let i = 0; i < dataRows.length; i += 4) {
      items.push({
        id: dataRows[i].trim(),
        startTime: timeMs(dataRows[i + 1].trim()),
        endTime: timeMs(dataRows[i + 2].trim()),
        text: dataRows[i + 3].trim()
      });
    }
    return items;
  };
})();