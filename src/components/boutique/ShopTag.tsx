import { useEffect, useState } from "react";
import QRCode from "qrcode";

function previewHost(host: string) {
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".grok-sandbox.com") || host.includes("preview");
}

export function ShopTag({ shopName }: { shopName: string }) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState(false);
  const [png, setPng] = useState("");

  useEffect(() => {
    const next = `${window.location.origin}/`;
    setUrl(next);
    setPreview(previewHost(window.location.hostname));
    let cancel = false;
    void drawTag(next, shopName).then((file) => {
      if (!cancel) setPng(file);
    });
    return () => {
      cancel = true;
    };
  }, [shopName]);

  return (
    <section className="shop-tag mx-auto max-w-sm">
      {png ? (
        <img src={png} alt={`Scan to open ${shopName}`} className="w-full border border-line" />
      ) : (
        <div className="aspect-[9/11] bg-card" />
      )}
      <div className="no-print mt-4 space-y-3">
        <p className="break-all text-sm text-ink-soft">{url || "Reading the shop address…"}</p>
        <p className="text-sm text-ink-soft">Print this from the published shop so a phone at the show opens the public link.</p>
        {preview && (
          <p className="text-sm text-brass-deep">
            This code still points at the preview. Publish first, open the public shop, then print the tag from there.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="min-h-11 rounded-full bg-sage px-4 text-on-sage" onClick={() => window.print()}>
            Print tag
          </button>
          {png && (
            <a className="inline-flex min-h-11 items-center rounded-full border border-line px-4" href={png} download="what-the-craft-tag.png">
              Download tag
            </a>
          )}
          <button type="button" className="min-h-11 rounded-full border border-line px-4" onClick={() => void navigator.clipboard.writeText(url)}>
            Copy address
          </button>
        </div>
      </div>
    </section>
  );
}

async function drawTag(url: string, shopName: string) {
  await document.fonts.ready;
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, url, {
    width: 640,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#2c2622", light: "#fbf8f3" },
  });
  const logo = await loadImage("/logo.png");
  const ctx = qr.getContext("2d");
  if (ctx) {
    const size = qr.width * 0.2;
    const x = (qr.width - size) / 2;
    ctx.fillStyle = "#fbf8f3";
    ctx.fillRect(x - 10, x - 10, size + 20, size + 20);
    ctx.drawImage(logo, x, x, size, size);
  }
  const tag = document.createElement("canvas");
  tag.width = 900;
  tag.height = 1100;
  const pen = tag.getContext("2d");
  if (!pen) return qr.toDataURL("image/png");
  pen.fillStyle = "#fbf8f3";
  pen.fillRect(0, 0, tag.width, tag.height);
  pen.strokeStyle = "#8c6a3d";
  pen.lineWidth = 28;
  pen.strokeRect(36, 36, tag.width - 72, tag.height - 72);
  pen.drawImage(logo, 386, 90, 128, 128);
  pen.fillStyle = "#2c2622";
  pen.font = "600 64px Fraunces, Georgia, serif";
  pen.textAlign = "center";
  pen.fillText(shopName, 450, 290, 760);
  pen.fillStyle = "#8c6a3d";
  pen.font = "500 28px Outfit, sans-serif";
  pen.fillText("SCAN TO SHOP", 450, 340);
  pen.drawImage(qr, 130, 380, 640, 640);
  return tag.toDataURL("image/png");
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Logo did not load."));
    image.src = src;
  });
}
