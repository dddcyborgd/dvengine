const IPFS_PREFIX = "ipfs://";

const IPFS_HTTPS = "https://ipfs.io/ipfs/";

export async function sha1(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

export function ipfsToHttp(url: string) {
    let cid = ipfsCID(url);

    if (cid) {
        return `${IPFS_HTTPS}${cid}`;
    } else {
        return url;
    }
}

export function isIPFS(url: string) {
    return url?.startsWith(IPFS_PREFIX);
}

export function isIPFSHttp(url: string) {
    return url?.startsWith(IPFS_HTTPS);
}

export function ipfsCID(url: string) {
    if (isIPFS(url)) {
        return url.slice(IPFS_PREFIX.length);
    }

    return ipfsHttpCID(url);
}

export function ipfsHttpCID(url: string) {
    if (isIPFSHttp(url)) {
        return url.slice(IPFS_HTTPS.length);
    }

    return null;
}

export function isPinataUrl(url: string) {
    return url?.startsWith("https://cyber.mypinata.cloud/ipfs/");
}

export function isIseadnUrl(url: string) {
    return (
        url?.startsWith("https://i.seadn.io") ||
        url?.startsWith("http://i.seadn.io")
    );
}

export function isCloudinaryUrl(url: string) {
    return (
        url?.startsWith("https://res.cloudinary.com/") ||
        url?.startsWith("http://res.cloudinary.com/")
    );
}

export function isImage(mimeType: string) {
    if (mimeType) return false;

    return [
        "image/jpg",
        "image/jpeg",
        "image/png",
        "image/bmp",
        "image/webp",
    ].includes(mimeType);
}

export function isURL(str: string) {
    try {
        if (!str) return false;

        const url = new URL(str);

        if (url.protocol !== "http:" && url.protocol !== "https:") return false;

        return url;
    } catch (e) {
        return false;
    }
}

export type IPFSGateway = "ipfs" | "cyber" | "autograph";

export const IPFS = {
    ipfs(cid: string) {
        return `https://ipfs.io/ipfs/${cid}`;
    },

    cyber(cid: string) {
        return `https://cyber.mypinata.cloud/ipfs/${cid}`;
    },

    autograph(cid: string) {
        return `https://gateway.autograph.io/ipfs/${cid}`;
    },

    gateway(cid: string, ...types: IPFSGateway[]) {
        //
        let urls = [];

        types.forEach((type) => {
            if (type === "autograph") {
                urls.push(IPFS.autograph(cid));
            } else if (type === "cyber") {
                urls.push(IPFS.cyber(cid));
            } else if (type === "ipfs") {
                urls.push(IPFS.ipfs(cid));
            }
        });

        return urls;
    },
};

const objktUrlTypes = {
    artifact: "artifact_uri",
    display: "display_uri",
    thumb: "artifact_uri",
};

export async function objkCDNUrlV2(
    asset,
    urlType: "artifact" | "display" | "thumb",
    fallback?: string
) {
    const {
        fa: { contract },
        token_id: id,
        mime,
    } = asset;

    if (
        !contract?.length ||
        !id?.length ||
        !(
            mime?.startsWith("image") ||
            mime?.startsWith("video") ||
            mime?.startsWith("audio") ||
            mime === "model/gltf-binary" ||
            mime === "application/x-directory"
        )
    )
        return fallback;

    const baseUrl = `https://assets.objkt.media/file/assets-003`;

    let urlField = objktUrlTypes[urlType];

    let url = asset[urlField];

    if (url == null) return fallback;

    let type: string = urlType;

    if (urlType === "thumb") {
        return `${baseUrl}/${contract}/${id}/thumb288`;
    }

    let urlId: string;

    if (isIPFS(url)) {
        urlId = ipfsCID(url);
    } else {
        urlId = await sha1(url);
    }

    return `${baseUrl}/${urlId}/${type}`;
}
