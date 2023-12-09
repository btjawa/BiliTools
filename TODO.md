# 让每个函数各司其职，不要为了串通逻辑而加一些它不该干的事

 - 例如将getVideoFull改为返回details，由调用它的函数.then()调用applyList //resolved

# 多选思路

用户每选中一个视频，就往待下载列表中添加该P的av/bv, cid, type("bangumi"...), title

## 方法1 //不再使用

当点击“下一步”结算选中时，遍历videoBlock并map待下载列表，如果不包含分p（title, cid鉴权）则remove()

遍历完成后删除videoInfo，改为提示词（"请确认分辨率..."），更新video-list高度

此方法end...

## 方法2

当点击“下一步”结算选中时，遍历videoBlock并map待下载列表，如果包含分p（title, cid鉴权）则copy到一个新的页面 //resolved

新的页面样式如login/downpage，占满全屏 //resolved

在新页面中最上方加上提示词（"请确认分辨率..."），更新新video-list高度 //resolved

此方法end...

确认并下载时，遍历等待列表并按av/bv, cid getVideoFull，扔给getDownUrl，随后跳转至下载页，重置搜索态

# 额外

不管是否多选，用户确认下载时都需要跳转至下载页

明确currentElm //12.7 12:15AM //resolved

# 数据

## videoData

[title, desc, pic, duration, aid, cid, type, index]

## currentSel

[dms_id(112), dms_desc(1080P高码率), codec_id(hevc...), codec_desc(H265), ads_id(30280), ads_desc(192K)]

## 高度

video-list-tab-head(computed): 41.6px

info(computed): 190px

search-bar(computed): 43px+4vh