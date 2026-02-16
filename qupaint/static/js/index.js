$(document).ready(function () {
  initPIAVisualizer();
  function initPIAVisualizer() {
    $(".pia-select")
      .off("click")
      .on("click", function () {
        const sampleId = $(this).data("id");
        updatePIAView(sampleId);
      });

    function updatePIAView(id) {
      $("#pia-waiting-overlay").fadeOut(300);
      $("#pia-status").css("visibility", "visible");
      $("#comparison-view").css("visibility", "visible");
      $(".pia-select").removeClass("is-active");
      $(`.pia-select[data-id="${id}"]`).addClass("is-active");

      const inputPath = `static/images/input${id}.png`;
      const outputPath = `static/images/output${id}.png`;

      const img1 = new Image();
      const img2 = new Image();
      let loadedCount = 0;

      const onLoaded = () => {
        loadedCount++;
        if (loadedCount === 2) {
          $("#main-input").attr("src", inputPath);
          $("#main-output").attr("src", outputPath);
          $("#comparison-view").animate({ opacity: 1 }, 200);
        }
      };

      $("#comparison-view").css("opacity", "0.2");

      img1.onload = onLoaded;
      img2.onload = onLoaded;

      img1.src = inputPath;
      img2.src = outputPath;
    }
  }
});