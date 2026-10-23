import slate from "@react-page/plugins-slate";
import { imagePlugin } from "@react-page/plugins-image";
import background, { ModeEnum } from "@react-page/plugins-background";
import divider from "@react-page/plugins-divider";
import spacer from "@react-page/plugins-spacer";
import { API_URL, imageSrc } from "../lib/api";
import { getStoredToken } from "../lib/cookies";

export const LANGUAGES = [
    { lang: "en", label: "English" },
    { lang: "fa", label: "Persian (فارسی)" },
];

const fakeImageUploadService = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const token = getStoredToken();
    const res = await fetch(`${API_URL}/api/media/upload`, {
        method: "POST",
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: fd,
    });
    if (!res.ok) throw new Error("Image upload failed");
    const saved = await res.json();
    return { url: imageSrc(saved.url) };
};

const defaultSlate = slate((def) => ({
    ...def,
    plugins: { ...def.plugins },
}));

export const cellPlugins = [
    defaultSlate,
    spacer,
    imagePlugin({ imageUpload: fakeImageUploadService }),
    divider,
    background({
        imageUpload: fakeImageUploadService,
        enabledModes:
            ModeEnum.COLOR_MODE_FLAG |
            ModeEnum.IMAGE_MODE_FLAG |
            ModeEnum.GRADIENT_MODE_FLAG,
    }),
];
