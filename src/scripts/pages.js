import { invoke } from "@tauri-apps/api";
import { once } from "@tauri-apps/api/event";
import { dialog } from '@tauri-apps/api';

import iziToast from "izitoast";
import $ from "jquery";

import * as data from "./data.ts";

const downDirPath = $('#down-dir-path');
const tempDirPath = $('#temp-dir-path');
const sidebar = data.sidebar;
const currentElm = data.currentElm;

once("settings", async (e) => {
    const p = e.payload;
    downDirPath.val(p.down_dir);
    tempDirPath.val(p.temp_dir);
    $(`#max-conc-${p.max_conc}`).click();
});

async function openFile(options = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            const selected = await dialog.open(options);
            resolve(selected);
        } catch (err) {
            console.error(err)
            reject(null);
        }
    });
}

$(document).ready(function () {
    sidebar.downPage.one('click', function() {
        const sel = $('.down-page-sel');
        sel.on('click', (event) => {
            const target = $(event.target).closest('.down-page-sel');
            const type = target.attr('class').split(/\s+/)[1];
            sel.removeClass('active');
            $('.down-page-child').removeClass('active');
            target.addClass('active');
            $(`.down-page-child.${type}`).addClass('active');
        });
    });
    sidebar.downPage.on('click', () => {
        currentElm.push(".down-page");
        $('.down-page').addClass('active');
        $('.down-page-sel').first().click();
    });
    sidebar.settings.one('click', function() {
        async function handleSave(set, input) {
            if (input) {
                const selected = await openFile({ directory: true });
                if (selected) {
                    input.val(selected)
                    iziToast.info({
                        icon: 'fa-solid fa-circle-info',
                        layout: 2, title: '设置',
                        message: `已保存设置 - ${set}`,
                    });
                };
            }
            invoke('rw_config', {action: "write", sets: {
                max_conc: parseInt($('.settings-page-options input[name="max-conc"]:checked').attr('id').replace(/[^\d]/g, "")),
                default_dms: 0,
                default_ads: 0,    
                temp_dir: tempDirPath.val(),
                down_dir: downDirPath.val()
            }, secret: data.secret});
        }
        $('.settings-side-bar-background').on('click', (event) => {
            const target = $(event.target).closest('.settings-side-bar-background');
            const type = target.attr('class').split(/\s+/)[1];
            $('.settings-side-bar-background').removeClass('checked');
            $('.settings-page').removeClass('active');
            target.addClass('checked');
            $(`.settings-page.${type}`).addClass('active');
            if (type === "_info") {
                const svg = $('.settings-page._info').find('svg').css('display', 'none');
                setTimeout(() => svg.append(svg.find('style').detach()).css('display', 'block'), 1);
            } else if (type == "general") invoke('handle_temp', { action: "calc" }).then(size => $('#temp-dir-size').html(size));
        });
        $('.settings-page-options input[name="max-conc"]').on('click', () => handleSave("最大并发下载数"));
        $('#down-dir-path-openbtn').on('click', () => handleSave("存储路径", downDirPath));
        $('#temp-dir-path-openbtn').on('click', () => handleSave("临时文件存储路径", tempDirPath));
        $('#temp-dir-clearbtn').on('click', () => invoke('handle_temp', { action: "clear" }).then(size => $('#temp-dir-size').html(size)));
        $('#aria2c-restart-btn').on('click', async () => invoke('handle_aria2c', { secret: data.secret, action: "restart" }));
    });
    sidebar.settings.on('click', () => {
        $('.settings').addClass('active');
        currentElm.push('.settings');    
        $('.settings-side-bar-background.general').click();
    });
})