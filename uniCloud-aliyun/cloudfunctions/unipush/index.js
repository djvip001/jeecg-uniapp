'use strict';
const uniPush = uniCloud.getPushManager({
	appId: "__UNI__E0CC280"
})
exports.main = async (event) => {
	let obj = JSON.parse(event.body)
	console.log("云函数obj",obj)
	const res = await uniPush.sendMessage({
		"push_clientid": obj.cids, // 设备id，支持多个以数组的形式指定多个设备，如["cid-1","cid-2"]，数组长度不大于1000  
		"title": obj.title, // 标题  
		"content": obj.content, // 内容  
		"payload": obj.data, // 数据  
		"force_notification": false, // 服务端推送 需要加这一句;填写true，客户端就会对在线消息自动创建“通知栏消息”。
		"request_id": obj.request_id,//请求唯一标识号，10-32位之间；如果request_id重复，会导致消息丢失 
		"options":{
			"HW": {
				"/message/android/notification/importance":"NORMAL",
				"/message/android/category":"WORK",
				"/message/android/target_user_type": 1
			},
			"VV": {
			    "/extra/callback.id":"8246"
			}
		}
	})
	return res   //一定要return回去
};
