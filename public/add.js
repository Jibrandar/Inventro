window.addEventListener("DOMContentLoaded", () => {
  const inputs = document.querySelectorAll("input[type='text'], input[type='number']");
  const submitBtn = document.querySelector(".btn");

  inputs.forEach((input, index) => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        if (index < inputs.length - 1) {
          inputs[index + 1].focus();
        } else {
          // Last input → trigger submit
          submitBtn.click();
        }
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (index > 0) {
          inputs[index - 1].focus();
        }
      }
    });
  });
});


