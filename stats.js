const MAX_DATA = 150;

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

function resetStats(resetCharts) {
  statsObj?.reset(resetCharts);
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

  reset(resetCharts) {
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
    if (dataSet.length < 7) return 0;

    let valsToAverage = dataSet.slice(4);

    let ema; // The running Exponential Moving Average
    let initialSamples = []; // To store the first 3 samples
    const alpha = 2 / (3 + 1); // Smoothing factor for EMA, using N = 3 to quickly adapt to changes
    let sampleCount = 0; // The count of samples

    // Callback function that receives the current send bitrate
    const updateEMA = (value) => {
      sampleCount++;

      // Only start calculating EMA after receiving 3 samples
      if (sampleCount <= 3) {
        initialSamples.push(value);
        if (sampleCount === 3) {
          // Initialize EMA with the average of the first 3 samples
          ema =
            initialSamples.reduce((a, b) => a + b, 0) / initialSamples.length;
        }
      } else {
        // Update EMA with each new sample
        ema = alpha * value + (1 - alpha) * ema;
      }
    };

    valsToAverage.forEach((v) => updateEMA(v));
    return ema;
  }

  addStats(latestStats) {
    if (!this.statsStartTime) {
      this.statsStartTime = latestStats.timestamp;
      this.localStartTime = Date.now();
    }

    const startTime = this.statsStartTime;
    const timeLabel = (latestStats.timestamp - startTime) / 1000;
    console.log(`${timeLabel}`, latestStats);
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
    const curRTT =
      latestStats.networkRoundTripTime != null
        ? latestStats.networkRoundTripTime
        : lastRTT;
    this.lastRTT = curRTT;

    this.rttVals.push(curRTT);
    rttData.data.push(curRTT);
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
    const curAOB =
      latestStats.availableOutgoingBitrate != null
        ? latestStats.availableOutgoingBitrate
        : lastAOB;
    this.lastAOB = curAOB;

    this.aobVals.push(curAOB);
    aobData.data.push(curAOB);
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
    const curPL =
      latestStats.videoSendPacketLoss != null
        ? latestStats.videoSendPacketLoss
        : lastPL;
    this.lastPL = curPL;

    this.splVals.push(curPL);
    plData.data.push(curPL);
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
    const curBPS =
      latestStats.videoSendBitsPerSecond != null
        ? latestStats.videoSendBitsPerSecond
        : lastBPS;
    this.lastBPS = curBPS;

    this.bpsVals.push(curBPS);
    bpsData.data.push(curBPS);
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
