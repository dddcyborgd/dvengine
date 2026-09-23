import { IPFS, ipfsCID, isIPFS } from "../utils/url";
import type { Asset, AssetUrl, HeadInfo, MediaInfo } from "../nfts/types";

const MAX_CHECK_RETRY_COUNT = 1;

// all mime types supported
const supportedMimes = [
  "image/jpg",
  "image/jpeg",
  "image/png",
  "image/svg",
  "image/svg+xml",
  "image/gif",
  "image/bmp",
  "image/webp",
  "video/quicktime",
  "video/mp4",
  "video/avi",
  "model/gltf-binary",
  "model/gltf+json",
  "audio/mpeg",
  "audio/wav",
  "video/x-m4v",
  "model/vrm",
];

function getUrlExtension(url = "") {
  const dotIndex = url.lastIndexOf(".");

  if (dotIndex < 0) return null;

  const ext = url.slice(dotIndex + 1, url.length);

  return ext;
}

const getAssetMime = (asset) => {
  if (asset?.mime_type) {
    return asset.mime_type;
  }
  if (!asset?.animation_url && asset?.image_url) {
    let extension = getUrlExtension(asset.image_url);

    if (extension === "jpg") {
      return "image/jpg";
    }
    if (extension === "jpeg") {
      return "image/jpeg";
    } else if (extension === "png") {
      return "image/png";
    } else if (extension === "svg") {
      return "image/svg";
    } else if (extension === "gif") {
      return "image/gif";
    } else if (extension === "bmp" || extension === "bin") {
      return "image/bmp";
    } else if (extension === "mp4") {
      asset.animation_url = asset.image_url;
      return "video/mp4";
    } else if (extension === "html") {
      return "text/html";
    } else {
      return null;
    }
  } else if (asset?.animation_url) {
    let extension = getUrlExtension(asset.animation_url);

    if (extension === "png") {
      asset.image_url = asset.animation_url;
      asset.animation_url = null;
      return "image/png";
    } else if (extension === "jpg") {
      asset.image_url = asset.animation_url;
      asset.animation_url = null;
      return "image/jpg";
    } else if (extension === "jpeg") {
      return "image/jpeg";
    } else if (extension === "svg") {
      return "image/svg";
    } else if (extension === "glb") {
      return "model/gltf-binary";
    } else if (extension === "gltf") {
      return "model/gltf+json";
    } else if (extension === "fbx") {
      return "model/fbx";
    } else if (extension === "obj") {
      return "model/obj";
    } else if (extension === "mov") {
      return "video/quicktime";
    } else if (extension === "mp4") {
      return "video/mp4";
    } else if (extension === "avi") {
      return "video/avi";
    } else if (extension === "gif") {
      return "image/gif";
    } else if (extension === "mp3") {
      return "audio/mpeg";
    } else if (extension === "wav") {
      return "audio/wav";
    } else if (extension === "html") {
      return "text/html";
    }
  } else if (asset?.animation_original_url) {
    let extension = getUrlExtension(asset.animation_original_url);

    if (extension === "png") {
      asset.image_url = asset?.animation_original_url;
      asset.image_original_url = asset?.animation_original_url;
      asset.animation_original_url = null;

      return "image/png";
    }
  }
  return null;
};

async function getNftMetadata(metadata_url: string) {
  //
  try {
    //
    if (isIPFS(metadata_url)) {
      metadata_url = metadata_url.replace(
        "ipfs://",
        "https://cyber.mypinata.cloud/ipfs/"
      );
    }

    if (metadata_url.startsWith("https://ipfs.io/ipfs")) {
      metadata_url = metadata_url.replace(
        "https://ipfs.io/ipfs",
        "https://cyber.mypinata.cloud/ipfs"
      );
    }

    const repsonse = await fetch(metadata_url);

    if (!repsonse.ok) throw new Error("Failed to fetch metadata");

    const metadata = await repsonse.json();

    const fields = [
      "vrm",
      "vrm_url",
      "image",
      "animation_url",
      "animation_original_url",
      "original_animation_url",
    ];

    let data = {};

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];

      if (metadata[field]) {
        data = {
          ...data,
          [field]: metadata[field],
        };
      }
    }

    if (Object.keys(data).length === 0) return null;

    return data;
  } catch (error) {
    return null;
  }
}

export async function getAssetMediaInfo(asset: Asset): Promise<MediaInfo> {
  //

  if (asset.token_metadata) {
    //
    const metadata = await getNftMetadata(asset.token_metadata);

    asset = { ...asset, ...metadata };
  }

  let mediaInfo;

  try {
    let urls = getUrls(asset);

    if (urls.length == 0) {
      console.error(
        "No media info was found in the metadata for the asset",
        asset.name
      );

      mediaInfo = { type: "NoTypeInfo" };
    } else {
      //
      mediaInfo = await getMediaInfo(asset, urls);

      if (mediaInfo.type === "NoTypeInfo") {
        console.error("Error checking media info for", asset.name);
      }
    }

    return mediaInfo;
  } catch (error) {
    mediaInfo = { type: "NoTypeInfo" };
  }

  return mediaInfo;
}

async function getMediaInfo(
  asset: Asset,
  urls: AssetUrl[]
): Promise<MediaInfo> {
  //

  if (!asset.mime_type) {
    asset.mime_type = getAssetMime(asset);
  }

  const result = await checkMedia(urls);

  if (result == null) {
    return { type: "NoTypeInfo" };
  }

  // always prefer the inferred mime_type if it exists. For glb files the HEAD
  // requets will result in an unsupported one: binary/octet-stream, asset.mime_type
  let mime_type: string = result.media_type;

  let { url, urlField, size } = result;

  if (!supportedMimes.includes(mime_type)) {
    return {
      type: "Unsupported",
      mime_type,
    };
  } else {
    return {
      type: "NotUploable",
      url,
      urlField,
      mime_type,
      size,
    };
  }
}

function getUrls(asset: Asset): AssetUrl[] {
  //

  let urlFields: string[] = [];

  if (!asset.animation_url && asset.image_url) {
    urlFields = ["image_original_url", "image_url"];
  } else {
    urlFields = [
      "vrm",
      "vrm_url",
      "animation_url",
      "animation_original_url",
      "original_animation_url",
    ];
  }

  let urls = urlFields
    .map((urlField) => {
      //
      const url = asset[urlField] as string;

      if (!url) return null;

      return {
        urlField,
        urls: preprocessUrl(asset, url, urlField),
      };
    })
    .filter((it) => it != null);

  return urls;
}

function preprocessUrl(asset: Asset, url: string, field: string) {
  let alts = [];

  const cid = ipfsCID(url);



  if (url.startsWith("https://storage.opensea.io/")) {
    url = url.replace(
      "https://storage.opensea.io/",
      "https://openseauserdata.com/"
    );
  }

  if (cid != null) {
    //
    alts.push(...IPFS.gateway(cid, "cyber", "autograph", "ipfs"));
  } else {
    //
    alts.push(url);
  }

  if (asset.mime_type === "application/x-directory") {
    alts = alts.flatMap((url) => {
      return [url, `${url}/index.html`];
    });
  }

  return alts;
}


async function checkMedia(urls: AssetUrl[]): Promise<{
  media_type: string;
  url: string;
  urlField: string;
  size: number;
} | null> {
  //

  for (let i = 0; i < urls.length; i++) {
    //
    let url = urls[i];

    let result = await headAlts(url.urls);

    if (result?.media_type != null) {
      //
      return {
        media_type: result.media_type,
        urlField: url.urlField,
        url: result.url,
        size: isFinite(result.size) ? result.size : 0,
      };
    }
  }
}

async function headAlts(urls: string[]): Promise<HeadInfo> {
  //

  for (let i = 0; i < urls.length; i++) {
    try {
      let url = urls[i];

      let response = await tryHead(url);

      if (response != null) {
        //
        let media_type = response.headers.get("Content-Type")?.split(";")[0];

        if (media_type == "png") media_type = "image/png";

        let size = +response.headers.get("Content-Length");

        if (supportedMimes.includes(media_type) && url.endsWith(".bin")) {
          media_type = "image/bmp";
        }

        return {
          media_type,
          size,
          url,
        };
      }
    } catch (err) {
      console.error(err);
    }
  }
}

async function tryHead(url: string): Promise<Response> {
  //
  for (let i = 0; i < MAX_CHECK_RETRY_COUNT; i++) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) return response;
      else {
        console.info(
          "tryHead",
          url,
          "returned with code ",
          response.status,
          response.statusText
        );
      }
    } catch (err) {
      //
    }
  }
}
