export function mountToast(root) {
  const el = document.createElement("div");
  el.className = "toast";
  root.appendChild(el);

  function show({ title, message, actionLabel, onAction, duration = 3200 }) {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `<div class="t">${title}</div><div class="m">${message || ""}</div>`;

    if (actionLabel && typeof onAction === "function") {
      const actionBtn = document.createElement("button");
      actionBtn.className = "btn small toast-action";
      actionBtn.type = "button";
      actionBtn.textContent = actionLabel;
      actionBtn.addEventListener("click", async () => {
        try {
          await onAction();
        } finally {
          item.remove();
        }
      });
      item.appendChild(actionBtn);
    }

    el.appendChild(item);
    setTimeout(() => item.remove(), duration);
  }

  return { show };
}
