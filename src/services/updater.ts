import { emit } from '@tauri-apps/api/event';
import { app } from '@tauri-apps/api';
import * as dialog from '@tauri-apps/plugin-dialog';
import { check } from '@tauri-apps/plugin-updater';
import { iziError } from '@/services/utils';
import Swal from "sweetalert2";

export async function checkUpdate() {
    try {
        const update = await check();
        if (update?.available) {
            console.log(update);
            const choice = await dialog.ask(`新版本：BiliTools v${update?.version} 可用！当前版本：v${await app.getVersion()}。
    \n您想要现在更新吗？
    \n更新发布时间：${update?.date}
    \n更新说明：\n${update?.body}
    \n更新期间将无法使用APP。更新下载完成后，将会自动重启应用以完成更新。`, "更新");
            if (choice) {
                Swal.fire({
                    title: "正在下载更新...",
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    },
                });
                await update.downloadAndInstall();
                await emit("restart");
            }
        }
    } catch(err) {
        iziError(err);
        return null;
    }
}