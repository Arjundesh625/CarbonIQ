/* CarbonIQ AI Application - Debugged & Refactored
   - Robust DOM guards
   - Chart.js availability checks
   - Chart instance lifecycle (destroy/recreate)
   - Event delegation (no brittle onclick selectors)
   - Debounced resize
*/

(() => {
  "use strict";

  // -----------------------------
  // Data (as provided)
  // -----------------------------
  const appData = {
    company: {
      name: "TechCorp Industries",
      industry: "Manufacturing",
      employees: 1250,
      locations: ["Bangalore", "Mumbai", "Delhi"],
      revenue: "$150M",
      currentYear: 2025,
    },
    emissions: {
      totalCO2: 8642.5,
      monthlyChange: -3.2,
      complianceScore: 87,
      reductionTarget: 25,
      progressToTarget: 62,
      scopeBreakdown: {
        scope1: {
          value: 2156.3,
          percentage: 24.9,
          description: "Direct emissions from owned/controlled sources",
        },
        scope2: {
          value: 3247.8,
          percentage: 37.6,
          description: "Indirect emissions from purchased energy",
        },
        scope3: {
          value: 3238.4,
          percentage: 37.5,
          description: "All other indirect emissions",
        },
      },
      monthlyTrends: [
        { month: "Jan 2025", emissions: 756.2 },
        { month: "Feb 2025", emissions: 743.1 },
        { month: "Mar 2025", emissions: 782.4 },
        { month: "Apr 2025", emissions: 697.8 },
        { month: "May 2025", emissions: 712.3 },
        { month: "Jun 2025", emissions: 689.5 },
        { month: "Jul 2025", emissions: 704.7 },
        { month: "Aug 2025", emissions: 678.9 },
        { month: "Sep 2025", emissions: 651.2 },
      ],
      categoryBreakdown: [
        { category: "Electricity", emissions: 3247.8, percentage: 37.6 },
        { category: "Transportation", emissions: 1852.4, percentage: 21.4 },
        { category: "Manufacturing", emissions: 1543.7, percentage: 17.9 },
        { category: "Heating/Cooling", emissions: 986.2, percentage: 11.4 },
        { category: "Waste", emissions: 543.8, percentage: 6.3 },
        { category: "Business Travel", emissions: 468.6, percentage: 5.4 },
      ],
    },
  };

  // Chart colors
  const chartColors = ["#1FB8CD", "#FFC185", "#B4413C", "#ECEBD5", "#5D878F", "#DB4545"];

  // -----------------------------
  // Utilities
  // -----------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function log(...args) {
    // Toggle to false to silence logs
    const DEBUG = true;
    if (DEBUG) console.log("[CarbonIQ]", ...args);
  }

  function warn(...args) {
    console.warn("[CarbonIQ]", ...args);
  }

  function debounce(fn, delay = 150) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  function cssVar(name, fallback = "") {
    const val = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (val && val.trim()) || fallback;
  }

  function formatTonnes(v) {
    // v is number
    return Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 });
  }

  // -----------------------------
  // State
  // -----------------------------
  const state = {
    charts: {},
    insightInterval: null,
  };

  // Expose charts if you need them globally
  window.charts = state.charts;

  // -----------------------------
  // Navigation
  // -----------------------------
  function showSection(sectionName) {
    const sections = $$(".section");
    const navLinks = $$(".nav-link");

    sections.forEach((s) => s.classList.remove("active"));

    const target = document.getElementById(sectionName);
    if (!target) {
      warn("Section not found:", sectionName);
      return;
    }

    target.classList.add("active");

    navLinks.forEach((link) => {
      const linkSection = link.getAttribute("data-section");
      link.classList.toggle("active", linkSection === sectionName);
    });

    // Resize charts when dashboard is visible
    if (sectionName === "dashboard") {
      setTimeout(resizeChartsSafe, 100);
    }
  }

  function initializeNavigation() {
    // Event delegation for nav clicks
    document.addEventListener("click", (e) => {
      const link = e.target.closest(".nav-link");
      if (!link) return;

      const section = link.getAttribute("data-section");
      if (!section) return;

      e.preventDefault();
      log("Nav ->", section);
      showSection(section);
    });
  }

  // -----------------------------
  // Charts
  // -----------------------------
  function destroyCharts() {
    Object.values(state.charts).forEach((ch) => {
      try {
        if (ch && typeof ch.destroy === "function") ch.destroy();
      } catch (err) {
        warn("Error destroying chart:", err);
      }
    });
    state.charts = {};
    window.charts = state.charts;
  }

  function resizeChartsSafe() {
    Object.values(state.charts).forEach((ch) => {
      try {
        if (ch && typeof ch.resize === "function") ch.resize();
      } catch (err) {
        // ignore
      }
    });
  }

  function initializeCharts() {
    // Guard: Chart.js must be loaded
    if (typeof window.Chart === "undefined") {
      warn("Chart.js not found. Include Chart.js before this script.");
      return;
    }

    // Re-init safely
    destroyCharts();

    // Slight delay to ensure canvases are in layout (esp. when switching sections)
    setTimeout(() => {
      initScopeChart();
      initTrendChart();
      initCategoryChart();
    }, 0);
  }

  function initScopeChart() {
    const canvas = document.getElementById("scopeChart");
    if (!canvas) return;

    const borderColor = cssVar("--color-surface", "#ffffff");

    state.charts.scopeChart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ["Scope 1", "Scope 2", "Scope 3"],
        datasets: [
          {
            data: [
              appData.emissions.scopeBreakdown.scope1.value,
              appData.emissions.scopeBreakdown.scope2.value,
              appData.emissions.scopeBreakdown.scope3.value,
            ],
            backgroundColor: chartColors.slice(0, 3),
            borderWidth: 2,
            borderColor,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
              font: { size: 12 },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || "";
                const value = context.parsed || 0;
                const pct = ((value / appData.emissions.totalCO2) * 100).toFixed(1);
                return `${label}: ${formatTonnes(value)} tonnes (${pct}%)`;
              },
            },
          },
        },
      },
    });

    log("Scope chart ready");
  }

  function initTrendChart() {
    const canvas = document.getElementById("trendChart");
    if (!canvas) return;

    const borderColor = cssVar("--color-border", "#e5e7eb");

    state.charts.trendChart = new Chart(canvas, {
      type: "line",
      data: {
        labels: appData.emissions.monthlyTrends.map((i) => i.month.split(" ")[0]),
        datasets: [
          {
            label: "CO₂ Emissions (tonnes)",
            data: appData.emissions.monthlyTrends.map((i) => i.emissions),
            borderColor: chartColors[0],
            backgroundColor: chartColors[0] + "20",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: chartColors[0],
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleColor: "#fff",
            bodyColor: "#fff",
            borderColor: chartColors[0],
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } },
          },
          y: {
            beginAtZero: false,
            grid: { color: borderColor, borderDash: [2, 2] },
            ticks: {
              font: { size: 11 },
              callback: (v) => Number(v).toLocaleString() + " t",
            },
          },
        },
      },
    });

    log("Trend chart ready");
  }

  function initCategoryChart() {
    const canvas = document.getElementById("categoryChart");
    if (!canvas) return;

    const borderColor = cssVar("--color-border", "#e5e7eb");

    state.charts.categoryChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: appData.emissions.categoryBreakdown.map((i) => i.category),
        datasets: [
          {
            label: "CO₂ Emissions (tonnes)",
            data: appData.emissions.categoryBreakdown.map((i) => i.emissions),
            backgroundColor: chartColors,
            borderColor: chartColors,
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed?.y ?? 0;
                const pct = ((value / appData.emissions.totalCO2) * 100).toFixed(1);
                return `${formatTonnes(value)} tonnes (${pct}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 45, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: borderColor, borderDash: [2, 2] },
            ticks: {
              font: { size: 11 },
              callback: (v) => Number(v).toLocaleString() + " t",
            },
          },
        },
      },
    });

    log("Category chart ready");
  }

  // -----------------------------
  // Upload
  // -----------------------------
  function initializeUpload() {
    const uploadZone = document.getElementById("uploadZone");
    const fileInput = document.getElementById("fileInput");
    if (!uploadZone || !fileInput) {
      log("Upload elements not found (ok if upload page not present).");
      return;
    }

    const onFile = (file) => {
      if (!file) return;
      simulateFileProcessing(file);
    };

    uploadZone.addEventListener("click", (e) => {
      e.preventDefault();
      fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      onFile(file);
      // allow re-upload of same file
      fileInput.value = "";
    });

    uploadZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadZone.classList.add("dragover");
    });

    uploadZone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      uploadZone.classList.remove("dragover");
    });

    uploadZone.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadZone.classList.remove("dragover");
      const file = e.dataTransfer?.files && e.dataTransfer.files[0];
      onFile(file);
    });
  }

  function simulateFileProcessing(file) {
    const processingSection = document.getElementById("processingSection");
    const extractionResults = document.getElementById("extractionResults");
    const progressFill = document.getElementById("progressFill");
    const processingStatus = document.getElementById("processingStatus");

    if (!processingSection || !extractionResults || !progressFill || !processingStatus) {
      warn("Processing UI elements not found.");
      return;
    }

    processingSection.style.display = "block";
    extractionResults.style.display = "none";

    const fileNameEl = processingSection.querySelector(".file-name");
    const fileSizeEl = processingSection.querySelector(".file-size");
    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileSizeEl) fileSizeEl.textContent = (file.size / 1024 / 1024).toFixed(1) + " MB";

    const stages = [
      { progress: 20, status: "Scanning document structure...", duration: 900 },
      { progress: 40, status: "Extracting text with OCR...", duration: 1200 },
      { progress: 65, status: "Identifying emissions data...", duration: 1000 },
      { progress: 85, status: "Applying AI categorization...", duration: 700 },
      { progress: 100, status: "Processing complete!", duration: 400 },
    ];

    let idx = 0;

    const step = () => {
      const s = stages[idx];
      progressFill.style.width = s.progress + "%";
      processingStatus.textContent = s.status;

      setTimeout(() => {
        idx += 1;
        if (idx < stages.length) return step();

        setTimeout(() => {
          processingSection.style.display = "none";
          extractionResults.style.display = "block";
          addActivityItem("New emissions data uploaded and processed", "upload");
        }, 450);
      }, s.duration);
    };

    step();
  }

  // -----------------------------
  // Modal / Report
  // -----------------------------
  function generateReport() {
    const modal = document.getElementById("reportModal");
    const fill = document.getElementById("modalProgressFill");
    if (!modal || !fill) {
      warn("Report modal elements not found.");
      return;
    }

    modal.classList.remove("hidden");

    let progress = 65;
    const steps = $$(".progress-step");
    const progressText = $(".progress-text");

    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

        setTimeout(() => {
          if (steps[3]) {
            steps[3].classList.add("active");
            const stepIcon = steps[3].querySelector(".step-icon");
            if (stepIcon) stepIcon.textContent = "✓";
          }
          if (progressText) progressText.textContent = "Report generated successfully!";

          setTimeout(() => {
            closeModal();
            addActivityItem(`Annual Carbon Report ${appData.company.currentYear} generated`, "report");
          }, 1600);
        }, 400);
      }

      fill.style.width = Math.min(progress, 100) + "%";
      if (progressText) progressText.textContent = `Processing... ${Math.floor(progress)}% complete`;
    }, 300);
  }

  function closeModal() {
    const modal = document.getElementById("reportModal");
    if (!modal) return;

    modal.classList.add("hidden");

    setTimeout(() => {
      const steps = $$(".progress-step");
      if (steps[3]) {
        steps[3].classList.remove("active");
        const stepIcon = steps[3].querySelector(".step-icon");
        if (stepIcon) stepIcon.textContent = "◯";
      }

      const fill = document.getElementById("modalProgressFill");
      if (fill) fill.style.width = "65%";

      const progressText = $(".progress-text");
      if (progressText) progressText.textContent = "Processing... 65% complete";
    }, 300);
  }

  // -----------------------------
  // Activity + UX
  // -----------------------------
  function addActivityItem(text, type) {
    const activityList = $(".activity-list");
    if (!activityList) return;

    const iconMap = {
      report: "📄",
      insight: "💡",
      upload: "📁",
      integration: "🔗",
      offset: "🌱",
    };

    const item = document.createElement("div");
    item.className = "activity-item";
    item.style.opacity = "0";
    item.style.transform = "translateY(-16px)";

    item.innerHTML = `
      <div class="activity-icon ${type}">${iconMap[type] || "📄"}</div>
      <div class="activity-content">
        <div class="activity-text"></div>
        <div class="activity-time">Just now</div>
      </div>
    `;

    const textEl = item.querySelector(".activity-text");
    if (textEl) textEl.textContent = text;

    activityList.insertBefore(item, activityList.firstChild);

    requestAnimationFrame(() => {
      item.style.opacity = "1";
      item.style.transform = "translateY(0)";
    });

    const items = $$(".activity-item", activityList);
    if (items.length > 5) {
      const last = items[items.length - 1];
      last.style.opacity = "0";
      last.style.transform = "translateY(16px)";
      setTimeout(() => last.remove(), 250);
    }
  }

  function showImplementationSuccess(card) {
    const button = card.querySelector(".btn");
    if (!button) return;

    button.textContent = "Implementation Started!";
    button.style.background = "var(--color-success)";
    button.disabled = true;

    card.style.borderColor = "var(--color-success)";
    card.style.boxShadow = "0 0 20px rgba(0,0,0,0.12)";

    setTimeout(() => {
      button.textContent = "✓ In Progress";
      card.style.opacity = "0.85";
      const h = card.querySelector("h3");
      addActivityItem(`${h ? h.textContent : "Recommendation"} implementation started`, "insight");
    }, 1200);
  }

  function showOffsetPurchaseSuccess(button) {
    button.textContent = "Processing...";
    button.disabled = true;
    button.style.background = "var(--color-warning)";

    setTimeout(() => {
      button.textContent = "✓ Purchase Complete";
      button.style.background = "var(--color-success)";
      addActivityItem("Offset purchase completed: 1,000 tCO₂e", "offset");
    }, 1400);
  }

  function initializeInteractions() {
    // Metric cards entrance animation (optional)
    setTimeout(() => {
      $$(".metric-card").forEach((card, i) => {
        setTimeout(() => {
          card.style.transform = "translateY(0)";
          card.style.opacity = "1";
        }, i * 80);
      });
    }, 80);

    // Event delegation for various buttons/cards
    document.addEventListener("click", (e) => {
      // Quick action: data-section buttons
      const sectionBtn = e.target.closest("[data-goto-section]");
      if (sectionBtn) {
        e.preventDefault();
        showSection(sectionBtn.getAttribute("data-goto-section"));
        return;
      }

      // Generate report
      const genBtn = e.target.closest("[data-action='generate-report']");
      if (genBtn) {
        e.preventDefault();
        generateReport();
        return;
      }

      // Close modal
      const closeBtn = e.target.closest("[data-action='close-modal']");
      if (closeBtn) {
        e.preventDefault();
        closeModal();
        return;
      }

      // Implement recommendation
      const implBtn = e.target.closest("[data-action='implement']");
      if (implBtn) {
        e.preventDefault();
        const card = implBtn.closest(".recommendation-card");
        if (card) showImplementationSuccess(card);
        return;
      }

      // Buy offset
      const offsetBtn = e.target.closest("[data-action='buy-offset']");
      if (offsetBtn) {
        e.preventDefault();
        showOffsetPurchaseSuccess(offsetBtn);
        return;
      }

      // Schedule AI Analysis
      const scheduleBtn = e.target.closest("[data-action='schedule-ai']");
      if (scheduleBtn) {
        e.preventDefault();
        addActivityItem("AI analysis scheduled for tonight", "insight");
        scheduleBtn.textContent = "✓ Analysis Scheduled";
        scheduleBtn.disabled = true;
        setTimeout(() => {
          scheduleBtn.textContent = "Schedule AI Analysis";
          scheduleBtn.disabled = false;
        }, 2500);
        return;
      }
    });

    // Hover effect (safe)
    document.addEventListener("mouseenter", (e) => {
      const item = e.target.closest(".activity-item");
      if (!item) return;
      item.style.transform = "translateX(5px)";
    }, true);

    document.addEventListener("mouseleave", (e) => {
      const item = e.target.closest(".activity-item");
      if (!item) return;
      item.style.transform = "translateX(0)";
    }, true);
  }

  // -----------------------------
  // AI Insights simulation
  // -----------------------------
  function startAIInsights() {
    const insights = [
      "AI detected 8% reduction opportunity in electricity usage",
      "Anomaly found: Transportation emissions 15% higher than expected",
      "Recommendation: Switch to renewable energy provider in Mumbai facility",
      "Predictive alert: Waste emissions likely to increase next month",
      "Smart suggestion: Bundle LED upgrade with solar installation for better ROI",
    ];

    stopAIInsights(); // ensure no duplicates

    state.insightInterval = setInterval(() => {
      const msg = insights[Math.floor(Math.random() * insights.length)];
      addActivityItem(msg, "insight");
    }, 45000);

    log("AI insights started");
  }

  function stopAIInsights() {
    if (state.insightInterval) clearInterval(state.insightInterval);
    state.insightInterval = null;
  }

  // -----------------------------
  // Boot
  // -----------------------------
  function boot() {
    log("Initializing...");

    initializeNavigation();
    initializeCharts();
    initializeUpload();
    initializeInteractions();

    // Default section
    showSection("dashboard");

    // Start insights after a short delay
    setTimeout(startAIInsights, 10000);
  }

  document.addEventListener("DOMContentLoaded", boot);

  // Resize handling (debounced)
  window.addEventListener(
    "resize",
    debounce(() => {
      resizeChartsSafe();
    }, 150)
  );

  // -----------------------------
  // Optional global exports (if your HTML calls these)
  // -----------------------------
  window.showSection = showSection;
  window.generateReport = generateReport;
  window.closeModal = closeModal;

  log("Loaded successfully");
})();
