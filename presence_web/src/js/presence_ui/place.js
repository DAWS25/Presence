window.addEventListener("DOMContentLoaded", () => {
    const iframe = document.createElement("iframe");
    const query = window.location.search || "";

    iframe.src = `app.html${query}`;
    iframe.title = "Presence App";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.display = "block";

    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.height = "100%";
    document.body.style.width = "100%";

    document.documentElement.style.height = "100%";
    document.documentElement.style.width = "100%";

    document.body.appendChild(iframe);
});
