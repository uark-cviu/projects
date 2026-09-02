window.HELP_IMPROVE_VIDEOJS = false;

var INTERP_BASE = "./static/interpolation/stacked";
var NUM_INTERP_FRAMES = 240;

var interp_images = [];
function preloadInterpolationImages() {
  for (var i = 0; i < NUM_INTERP_FRAMES; i++) {
    var path = INTERP_BASE + '/' + String(i).padStart(6, '0') + '.png';
    interp_images[i] = new Image();
    interp_images[i].src = path;
  }
}

function setInterpolationImage(i) {
  var image = interp_images[i];
  image.ondragstart = function() { return false; };
  image.oncontextmenu = function() { return false; };
  $('#interpolation-image-wrapper').empty().append(image);
}


$(document).ready(function() {
  // --- Configuration ---
  const TYPE_SPEED_MS = 25;
  const DATA_ROOT = './qf_bench_50/';
  let curatedData = null;
  let runId = 0;
  initPIAVisualizer();
  // --- MLLM Phrasing Pools (Instructional Cues from QuPAINT) ---
  const BOT_PHRASING = {
    total_found: [
      "I detect all flake-like regions in the image, producing candidate boxes sorted from top-left to bottom-right: {coords}. By testing their transparency and brightness difference, I confirm whether mono layers are present.",
      "I extract all candidate flakes as {coords} from top-left to bottom-right. I then check each region: mono layer flakes show lighter contrast and subtle color shift relative to the substrate.",
      "Scanning the field, I localize all candidate flakes: {coords}. I then apply monolayer criteria: low contrast and subtle color shift relative to the background.",
      "Beginning with a full-field scan, I've mapped all candidate regions: {coords}. I am now verifying these against monolayer optical signatures.",
      "Initial processing identifies multiple potential regions at {coords}. I am cross-referencing their contrast levels with the substrate properties.",
      "All flake-like structures have been localized at {coords}. I am evaluating each for the specific optical properties of a 1L thickness.",
      "Grid-based detection reveals the following candidates: {coords}. I will now filter them based on their relative brightness and transparency.",
      "I have highlighted all distinct regions from top-left to bottom-right: {coords}. My next step is confirming which ones exhibit monolayer contrast.",
      "Processing the image for flake-like objects yields these coordinates: {coords}. I'm assessing their light-to-dark ratio compared to the background.",
      "Candidates have been isolated at {coords}. I’m analyzing their spectral shift and edge definition to confirm monolayer presence."
    ],
    mono_found: [
      "Monolayer flakes usually appear faint, with very low contrast compared to the background and a semi-transparent look. By filtering candidates with these cues, my conclusion is: There are {count} at {coords}.",
      "I evaluate transparency and contrast against the background to identify monolayers. I then keep only those with faint contrast and low color variation from the substrate. The answer is yes, there are {count} at {coords}.",
      "Monolayers are those with minimal brightness difference and semi-transparent edges. By testing their transparency and brightness difference, I confirm {count} monolayer flake(s) at {coords}.",
      "By isolating regions with minimal optical density and high transparency, I’ve identified {count} monolayer(s) at {coords}.",
      "The analysis confirms {count} monolayer flake(s) at {coords}, based on their characteristic low contrast and subtle color response.",
      "I have filtered the candidates to find those with the most subtle color shifts. My conclusion: {count} flake(s) at {coords} are monolayers.",
      "Based on the physics of thin-film interference, {count} region(s) at {coords} match the profile for a monolayer.",
      "The faint contrast signatures indicate {count} monolayer(s). You can find them at {coords}.",
      "Matching the optical properties of 1L thickness, I have located {count} flakes at {coords}.",
      "Only {count} flake(s) at {coords} pass the threshold for semi-transparency and low brightness difference."
    ],
    localization: [
      "I first detect all flakes and then select the ones with very low contrast and semi-transparent appearance. My conclusion is: {coords}.",
      "I keep only those with faint contrast and low color variation from the substrate to identify monolayers. The 1L flakes are at: {coords}.",
      "I extract all candidate flakes and apply mono layer criteria: low contrast and subtle color shift relative to the background. The monolayers are localized at: {coords}.",
      "Applying the 1L contrast mask, I have localized the monolayer flakes at: {coords}.",
      "The confirmed monolayer coordinates, sorted for visibility, are: {coords}.",
      "Refining the search to only the most transparent regions, I find the 1L flakes at: {coords}.",
      "Here are the precise locations for the identified monolayers: {coords}.",
      "Targeting only the low-contrast signatures, the 1L flakes are situated at: {coords}.",
      "The monolayer regions have been successfully isolated. Their coordinates are: {coords}.",
      "Finalizing the spatial mapping for all confirmed 1L flakes: {coords}."
    ]
  };

  // -----------------------------
  // Initialization
  // -----------------------------
  fetch(`${DATA_ROOT}annotations.json`)
    .then(res => res.json())
    .then(data => {
      curatedData = data;
      buildTopGallery();
      buildMiniBrowser();
    })
    .catch(err => console.error("Error loading QuPAINT data:", err));

  // -----------------------------
  // Main Gallery & Selection
  // -----------------------------
  function buildTopGallery() {
    const galleryContainer = $('#gallery-items');
    galleryContainer.empty();
    curatedData.images.slice(0, 6).forEach((imgObj, index) => {
      const imgPath = `${DATA_ROOT}${imgObj.file_name}`;
      galleryContainer.append(`
        <button class="thumb" data-index="${index}">
          <img src="${imgPath}" loading="lazy">
        </button>
      `);
    });
  }

  $(document).on('click', '.thumb', function() {
    $('.thumb').removeClass('is-selected');
    $(this).addClass('is-selected');
    runId++;
    resetUI();
    const idx = $(this).data('index');
    const selectedSample = curatedData.images[idx];
    $('#chat-placeholder').addClass('is-hidden');
    playQuPAINTConversation(selectedSample, runId);
  });

  // -----------------------------
  // Sequential MLLM Conversation
  // -----------------------------
async function playQuPAINTConversation(sample, rid) {
    const anns = curatedData.annotations.filter(a => a.image_id === sample.id);
    const mono = anns.filter(a => a.category_id === 1);

    // TURN 1: Enumeration
    const userQueries1 = [
        "How many monolayer flakes are there in the image?",
        "Can you count the total number of flakes present?",
        "Identify all flake candidates in this view.",
        "How many regions of interest do you see?",
        "Scan the image and tell me the total flake count.",
        "Give me an enumeration of all flakes detected here.",
        "What is the total number of candidates found?",
        "Could you list the flake-like regions in this sample?",
        "I need a count of all potential flakes in this frame.",
        "Detect and count all flake structures in the image."
    ];
    userSay(pickRandom(userQueries1));

    await wait(randomDelay(1500, 3000));
    if (rid !== runId) return;

    const totalMsg = pickRandom(BOT_PHRASING.total_found).replace("{coords}", formatCoords(anns));
    await botTypeComplex(totalMsg, rid);
    await wait(randomDelay(4000, 6500));
    await botSendImage(sample, anns, "Flake Candidate Enumeration", rid);
    await(wait(randomDelay(500,1000)))

    // TURN 2: Reasoning
    const userQueries2 = [
        "Confirm if this sample includes mono layer flakes.",
        "Are there any actual monolayers among these candidates?",
        "Verify which of these are 1L flakes.",
        "Can you identify the specific monolayers here?",
        "Perform a physics-check: are any of these monolayers?",
        "I need to know if any of these are confirmed as mono layers.",
        "Check the contrast levels—do we have any 1L flakes?",
        "Filter these candidates for monolayer properties.",
        "Are there any semi-transparent monolayers in this set?",
        "Confirm the presence of 1L thickness in these regions."
    ];
    userSay(pickRandom(userQueries2));

    await wait(randomDelay(1500, 3000));
    if (rid !== runId) return;

    if (mono.length > 0) {
      const monoMsg = pickRandom(BOT_PHRASING.mono_found)
        .replace("{count}", mono.length)
        .replace("{coords}", formatCoords(mono));
      await botTypeComplex(monoMsg, rid);
      await wait(randomDelay(4000, 6500));
      await botSendImage(sample, mono, "Physics-Informed Reasoning", rid);
    } else {
      await botTypeComplex("I have applied monolayer criteria. No regions matching the required faint contrast or semi-transparent appearance were detected.", rid);
    }
    await(wait(randomDelay(500,1000)))

    // TURN 3: Localization
    if (mono.length > 0 && rid === runId) {
      const userQueries3 = [
          "Locate all the mono layer flakes in the image.",
          "Where exactly are the monolayers positioned?",
          "Give me the final coordinates for the 1L flakes.",
          "Show me where the monolayers are localized.",
          "Provide the spatial mapping for the detected monolayers.",
          "Pinpoint the 1L regions for me.",
          "I need the specific locations of the monolayer flakes.",
          "Mark the final coordinates for the confirmed 1L regions.",
          "Can you output the localization for the monolayers?",
          "Show me the final results for the 1L flake positions."
      ];
      userSay(pickRandom(userQueries3));

      await wait(randomDelay(1500, 3000));
      if (rid !== runId) return;

      const locMsg = pickRandom(BOT_PHRASING.localization).replace("{coords}", formatCoords(mono));
      updateCoordinateChips(mono);
      await botTypeComplex(locMsg, rid);
      await wait(randomDelay(4000, 6500));
      await botSendImage(sample, mono, "Structured Final Conclusion", rid);
    }
}

function initPIAVisualizer() {
  // We no longer call updatePIAView(1) here to keep the "Please Click" state

  $('.pia-select').off('click').on('click', function() {
    const sampleId = $(this).data('id');
    updatePIAView(sampleId);
  });

  function updatePIAView(id) {
    // 1. Reveal the viewer components
    $('#pia-waiting-overlay').fadeOut(300);
    $('#pia-status').css('visibility', 'visible');
    $('#comparison-view').css('visibility', 'visible');

    // 2. UI selection state
    $('.pia-select').removeClass('is-active');
    $(`.pia-select[data-id="${id}"]`).addClass('is-active');

    // 4. Update Images with pre-loading
    const inputPath = `static/images/input${id}.png`;
    const outputPath = `static/images/output${id}.png`;

    const img1 = new Image();
    const img2 = new Image();

    let loadedCount = 0;
    const onLoaded = () => {
      loadedCount++;
      if(loadedCount === 2) {
        $('#main-input').attr('src', inputPath);
        $('#main-output').attr('src', outputPath);
        $('#comparison-view').animate({opacity: 1}, 200);
      }
    };

    $('#comparison-view').css('opacity', '0.2');
    img1.onload = onLoaded;
    img2.onload = onLoaded;
    img1.src = inputPath;
    img2.src = outputPath;
  }
}  // -----------------------------
  // Refined Typing & Rendering
  // -----------------------------
  function formatCoords(anns) {
    if (!anns || anns.length === 0) return "None";
    const coordsList = anns.map(a => `[${a.bbox.map(n => Math.round(n)).join(', ')}]`).join(', ');
    return `|||<span class="coord-highlight">${coordsList}</span>|||`;
  }

  async function botTypeComplex(rawText, rid) {
    if (rid !== runId) return;
    const $bubble = $(`<div class="msg-row bot"><div class="bubble bot"></div></div>`);
    $('#chat-messages').append($bubble);
    const $inner = $bubble.find('.bubble');
    const parts = rawText.split('|||');

    for (const part of parts) {
      if (rid !== runId) return;
      if (part.startsWith('<span')) {
        // Extract content between tags: <span class="coord-highlight">CONTENT</span>
        const content = part.replace(/<[^>]*>/g, '');
        const $span = $(part.match(/<span[^>]*>/)[0] + '</span>');
        $inner.append($span);
        // Type the coordinates inside the span
        for (let i = 0; i < content.length; i++) {
          if (rid !== runId) return;
          $span.append(content[i]);
          scrollToBottom();
          await wait(10); // Slightly faster for coordinate strings
        }
      } else {
        for (let i = 0; i < part.length; i++) {
          if (rid !== runId) return;
          $inner.append(part[i]);
          scrollToBottom();
          await wait(TYPE_SPEED_MS);
        }
      }
    }
  }

  async function botSendImage(sample, detections, label, rid) {
    if (rid !== runId) return;
    const imgPath = `${DATA_ROOT}${sample.file_name}`;
    const $img = $(`
      <div class="msg-row bot">
        <div class="bubble bot image-response">
          <div class="canvas-wrapper" style="position:relative;">
            <img src="${imgPath}" style="width:100%; border-radius:8px;">
            <svg style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;"></svg>
          </div>
        </div>
      </div>
    `);
    $('#chat-messages').append($img);
    const svg = $img.find('svg')[0];

    detections.forEach(det => {
      const [x, y, w, h] = det.bbox;
      const color = det.category_id === 1 ? "#ed91ff" : (det.category_id === 2 ? "#609dff" : "#88ff5d");
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", `${(x / sample.width) * 100}%`);
      rect.setAttribute("y", `${(y / sample.height) * 100}%`);
      rect.setAttribute("width", `${(w / sample.width) * 100}%`);
      rect.setAttribute("height", `${(h / sample.height) * 100}%`);
      rect.setAttribute("style", `fill:none; stroke:${color}; stroke-width:2; vector-effect: non-scaling-stroke;`);
      svg.appendChild(rect);
    });
    scrollToBottom();
  }

  // --- Utilities ---
function buildMiniBrowser() {
  const miniGallery = $('#mini-gallery');
  miniGallery.empty();

  // Browsing samples 10 through 25 from the dataset
  const slice = curatedData.images.slice(10, 26);

  slice.forEach((imgObj, k) => {
    miniGallery.append(`
      <button class="mini-thumb" data-idx="${k}" style="width: 100%; margin-bottom: 10px; cursor: pointer; border: 2px solid transparent; border-radius: 6px; overflow: hidden; padding: 0;">
        <img src="${DATA_ROOT}${imgObj.file_name}" style="display: block; width: 100%;">
      </button>`);
  });

  $('.mini-thumb').on('click', function() {
    $('.mini-thumb').css('border-color', 'transparent');
    $(this).css('border-color', '#d97706');

    const s = slice[$(this).data('idx')];
    const anns = curatedData.annotations.filter(a => a.image_id === s.id);
    const mat = s.file_name.split('/')[1].toUpperCase();

    // UI State Management
    $('#pia-empty-state').hide();
    $('#pia-display-container').show();
    $('#mini-meta').html(`PIA Generation: <strong>${mat}</strong> (Sample #${s.id})`);

    // 1. Set Raw Image
    $('#pia-raw-img').attr('src', `${DATA_ROOT}${s.file_name}`);

    // 2. Generate Heatmap on Canvas
    const canvas = document.getElementById('pia-heatmap-canvas');
    canvas.width = s.width;
    canvas.height = s.height;
    const ctx = canvas.getContext('2d');

    // Reset with black background (zero attention)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw blurred attention spots based on ground truth locations
    // This simulates the PIA module's focus on contrast-relevant patches
    ctx.globalCompositeOperation = 'lighter';
    anns.forEach(a => {
      const [x, y, w, h] = a.bbox;
      const centerX = x + w / 2;
      const centerY = y + h / 2;
      const radius = Math.max(w, h) * 1.2;

      // Create radial gradient to mimic soft attention weights
      const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

      // Color intensity based on category: Mono (id:1) gets highest attention
      if (a.category_id === 1) {
        grad.addColorStop(0, 'rgba(255, 100, 0, 0.9)'); // High intensity orange
        grad.addColorStop(1, 'rgba(255, 50, 0, 0)');
      } else {
        grad.addColorStop(0, 'rgba(0, 100, 255, 0.6)'); // Lower intensity blue/cyan
        grad.addColorStop(1, 'rgba(0, 50, 200, 0)');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 500; i++) {
        ctx.fillRect(Math.random() * s.width, Math.random() * s.height, 2, 2);
    }
  });
}
  function userSay(txt) { $('#chat-messages').append(`<div class="msg-row user"><div class="bubble user">${txt}</div></div>`); scrollToBottom(); }
  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randomDelay(min, max) { return Math.floor(Math.random() * (max - min + 1) + min); }
  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
  function resetUI() { $('#chat-messages').empty(); $('#roi-chips').empty(); }
  function scrollToBottom() { $('#chat-box').scrollTop($('#chat-box')[0].scrollHeight); }
  function updateCoordinateChips(detections) {
    const chips = $('#roi-chips').empty();
    detections.forEach(d => {
      const [x, y] = d.bbox;
      chips.append(`<span class="tag is-light" style="color: #d97706; font-weight:bold;">X:${Math.round(x)}, Y:${Math.round(y)}</span>`);
    });
  }
});