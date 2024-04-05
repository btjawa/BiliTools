import { checkUpdate, installUpdate, onUpdaterEvent } from '@tauri-apps/api/updater'
import { emit } from '@tauri-apps/api/event';
import { dialog, app } from '@tauri-apps/api';
import { relaunch } from '@tauri-apps/api/process'

import Swal from "sweetalert2";

const unlisten = await onUpdaterEvent(({ error, status }) => {
    // This will log all updater events, including status updates and errors.
    console.log('Updater event', error, status)
    if (status == "DONE") { Swal.close() } // To close Swal.
})

try {
    const { shouldUpdate, manifest } = await checkUpdate()
    if (shouldUpdate) {
        // You could show a dialog asking the user if they want to install the update here.
        console.log("We received a update.");
        console.log(manifest);
        const choice = await dialog.ask(`新版本：BiliTools v${manifest?.version} 可用！当前版本：v${await app.getVersion()}。
\n您想要现在更新吗？
\n更新发布时间：${manifest?.date}
\n更新说明：\n${manifest?.body}
\n注意：更新期间将无法使用APP。
更新下载完成后，将会自动重启应用以完成更新。`, "更新");
        if (choice) {
            Swal.fire({
                title: "正在下载更新...",
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });
            // Install the update. This will also restart the app on Windows!
            await installUpdate()
            // On macOS and Linux you will need to restart the app manually.
            // You could use this step to display another confirmation dialog.
            await relaunch()
        }
    }
} catch (e) { emit("error", e) }

// you need to call unlisten if your handler goes out of scope, for example if the component is unmounted.
unlisten()