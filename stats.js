const MAX_DATA = 150;
const SMOOTHING_FACTOR = 3;

let statsObj = null;

function initializeCharts() {
  let script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
  document.body.appendChild(script);
  script.onload = () => {
    statsObj = new Stats();
  };
}

function addStats(latestStats) {
  statsObj?.addStats(latestStats);
}

function resetStats(resetCharts, sFactor) {
  statsObj?.reset(resetCharts, sFactor);
}

class Stats {
  constructor() {
    this.cxCnt = 0;
    this.intCnt = 0;
    this.initialize();
  }

  initialize() {
    const rttCtx = document.getElementById('rttChart');
    const aobCtx = document.getElementById('aobChart');
    const plCtx = document.getElementById('splChart');
    const bpsCtx = document.getElementById('bpsChart');

    this.rttVals = [];
    this.aobVals = [];
    this.splVals = [];
    this.bpsVals = [];

    this.rttChart = new Chart(rttCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'rtt',
            data: [],
          },
          {
            label: 'moving avg rtt',
            data: [],
          },
        ],
      },
      options: {
        plugin: {
          legend: {
            title: 'Round Trip Time',
            hidden: false,
          },
        },
      },
    });

    this.aobChart = new Chart(aobCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'availableOutgoingBitrate',
            data: [],
          },
          {
            label: 'moving avg availableOutgoingBitrate',
            data: [],
          },
        ],
      },
      options: {
        plugin: {
          legend: {
            title: 'available outgoing bitrate',
            hidden: false,
          },
        },
      },
    });

    this.splChart = new Chart(plCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'packet loss',
            data: [],
          },
          {
            label: 'moving avg packet loss',
            data: [],
          },
        ],
      },
      options: {
        plugin: {
          legend: {
            title: 'Packet Loss',
            hidden: false,
          },
        },
      },
    });

    this.bpsChart = new Chart(bpsCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'send bits per second',
            data: [],
          },
          {
            label: 'moving avg bps',
            data: [],
          },
        ],
      },
      options: {
        plugin: {
          legend: {
            title: 'Send Bits Per Second',
            hidden: false,
          },
        },
      },
    });
  }

  reset(resetCharts, sFactor = SMOOTHING_FACTOR) {
    this.sFactor = sFactor;

    this.rttVals = [];
    this.aobVals = [];
    this.splVals = [];
    this.bpsVals = [];

    if (resetCharts) {
      this.rttChart.data.labels = [];
      this.aobChart.data.labels = [];
      this.splChart.data.labels = [];
      this.bpsChart.data.labels = [];

      this.rttChart.data.datasets[0].data = [];
      this.rttChart.data.datasets[1].data = [];
      this.aobChart.data.datasets[0].data = [];
      this.aobChart.data.datasets[1].data = [];
      this.splChart.data.datasets[0].data = [];
      this.splChart.data.datasets[1].data = [];
      this.bpsChart.data.datasets[0].data = [];
      this.bpsChart.data.datasets[1].data = [];
    }
  }

  calculateMovingAverage(dataSet) {
    let valsToAverage = dataSet.slice(4);

    valsToAverage = valsToAverage.filter((j) => j != null);

    if (valsToAverage.length < 3) return 0;

    let firstThree = valsToAverage.slice(0, 3);
    let theRest = valsToAverage.slice(3, valsToAverage.length);

    // Exponention Moving Average value.
    // Initialize with the straight average of the first 3 samples
    let ema = firstThree.reduce((a, b) => a + b, 0) / firstThree.length;

    // if we only had 3 valid stats, return straight average
    if (!theRest.length) return ema;

    const alpha = 2 / (this.sFactor + 1); // Smoothing factor for EMA, using N = 3 to quickly adapt to changes

    // Callback function that receives the current send bitrate
    const updateEMA = (value) => {
      // Update EMA with each new sample
      ema = alpha * value + (1 - alpha) * ema;
    };

    theRest.forEach((v) => updateEMA(v));
    return ema;
  }

  addStats(latestStats) {
    if (!this.statsStartTime) {
      this.statsStartTime = latestStats.timestamp;
      this.localStartTime = Date.now();
    }

    const startTime = this.statsStartTime;
    const timeLabel = (latestStats.timestamp - startTime) / 1000;
    this.rttChart.data.labels.push(timeLabel);
    if (this.rttChart.data.labels.length > MAX_DATA) {
      this.rttChart.data.labels.shift();
    }
    this.aobChart.data.labels.push(timeLabel);
    if (this.aobChart.data.labels.length > MAX_DATA) {
      this.aobChart.data.labels.shift();
    }
    this.splChart.data.labels.push(timeLabel);
    if (this.splChart.data.labels.length > MAX_DATA) {
      this.splChart.data.labels.shift();
    }
    this.bpsChart.data.labels.push(timeLabel);
    if (this.bpsChart.data.labels.length > MAX_DATA) {
      this.bpsChart.data.labels.shift();
    }

    // update rtt chart
    const rttData = this.rttChart.data.datasets[0];
    const lastRTT = this.lastRTT || 0;
    const curRTT = latestStats.networkRoundTripTime;
    const graphRTT = curRTT ?? lastRTT;
    this.lastRTT = graphRTT;

    this.rttVals.push(curRTT);
    rttData.data.push(graphRTT);
    if (rttData.data.length > MAX_DATA) {
      rttData.data.shift();
    }

    // fill in moving average for rtt
    let mAvgRTTData = this.rttChart.data.datasets[1];
    let mAvg = this.calculateMovingAverage(this.rttVals);
    mAvgRTTData.data.push(mAvg);
    if (mAvgRTTData.data.length > MAX_DATA) {
      mAvgRTTData.data.shift();
    }

    // update aob chart
    const aobData = this.aobChart.data.datasets[0];
    const lastAOB = this.lastAOB || 0;
    const curAOB = latestStats.availableOutgoingBitrate;
    const graphAOB = curAOB ?? lastAOB;
    this.lastAOB = graphAOB;

    this.aobVals.push(curAOB);
    aobData.data.push(graphAOB);
    if (aobData.data.length > MAX_DATA) {
      aobData.data.shift();
    }
    // fill in moving average for aob
    let mAvgAOBData = this.aobChart.data.datasets[1];
    mAvg = this.calculateMovingAverage(this.aobVals);
    mAvgAOBData.data.push(mAvg);
    if (mAvgAOBData.data.length > MAX_DATA) {
      mAvgAOBData.data.shift();
    }

    // update spl chart
    const plData = this.splChart.data.datasets[0];
    const lastPL = this.lastPL || 0;
    const curPL = latestStats.totalSendPacketLoss;
    // for graphing, if we get a null, we just re-use the last value.
    // but we don't want that to skew our overall averaging.
    const graphPL = curPL ?? lastPL;
    this.lastPL = graphPL;

    this.splVals.push(curPL);
    plData.data.push(graphPL);
    if (plData.data.length > MAX_DATA) {
      plData.data.shift();
    }

    // fill in moving average for spl
    let mAvgPLData = this.splChart.data.datasets[1];
    mAvg = this.calculateMovingAverage(this.splVals);
    mAvgPLData.data.push(mAvg);
    if (mAvgPLData.data.length > MAX_DATA) {
      mAvgPLData.data.shift();
    }

    // update bps chart
    const bpsData = this.bpsChart.data.datasets[0];
    const lastBPS = this.lastBPS || 0;
    const curBPS = latestStats.sendBitsPerSecond;
    const graphBPS = curBPS ?? lastBPS;
    this.lastBPS = graphBPS;

    this.bpsVals.push(curBPS);
    bpsData.data.push(graphBPS);
    if (bpsData.data.length > MAX_DATA) {
      bpsData.data.shift();
    }

    // fill in moving average for bps
    let mAvgBPSData = this.bpsChart.data.datasets[1];
    mAvg = this.calculateMovingAverage(this.bpsVals);
    mAvgBPSData.data.push(mAvg);
    if (mAvgBPSData.data.length > MAX_DATA) {
      mAvgBPSData.data.shift();
    }

    this.rttChart.update();
    this.aobChart.update();
    this.splChart.update();
    this.bpsChart.update();
  }
}
