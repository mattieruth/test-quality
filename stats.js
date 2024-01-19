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

class Stats {
  constructor() {
    this.cxCnt = 0;
    this.intCnt = 0;
    this.initialize();
  }

  initialize() {
    const rttCtx = document.getElementById('rttChart');
    const aobCtx = document.getElementById('aobChart');
    const plCtx = document.getElementById('plChart');
    const bpsCtx = document.getElementById('bpsChart');

    this.rttVals = [];
    this.aobVals = [];
    this.plVals = [];
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

    this.plChart = new Chart(plCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'packet loss',
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
    this.plChart.data.labels.push(timeLabel);
    if (this.plChart.data.labels.length > MAX_DATA) {
      this.plChart.data.labels.shift();
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
    let last20 = this.aobVals.slice(-10);
    const mAvg = last20.reduce((a, f) => a + f) / last20.length;
    mAvgAOBData.data.push(mAvg);
    if (mAvgAOBData.data.length > MAX_DATA) {
      mAvgAOBData.data.shift();
    }

    // update pl chart
    const plData = this.plChart.data.datasets[0];
    const lastPL = this.lastPL || 0;
    const curPL =
      latestStats.videoSendPacketLoss != null
        ? latestStats.videoSendPacketLoss
        : lastPL;
    this.lastPL = curPL;

    this.plVals.push(curPL);
    plData.data.push(curPL);
    if (plData.data.length > MAX_DATA) {
      plData.data.shift();
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

    this.rttChart.update();
    this.aobChart.update();
    this.plChart.update();
    this.bpsChart.update();
  }
}
