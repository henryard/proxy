// test_rename.js
// 这是一个极简的测试脚本，它会给每一个节点名称前面加上"TEST-OK-"的前缀。

function operator(proxies) {
  // 检查 proxies 是否是一个有效的数组
  if (!Array.isArray(proxies)) {
    return proxies;
  }
  
  // 遍历每一个节点对象
  for (let i = 0; i < proxies.length; i++) {
    // 确保节点对象和 name 属性存在
    if (proxies[i] && proxies[i].name) {
      proxies[i].name = "TEST-OK- " + proxies[i].name;
    }
  }
  
  // 返回修改后的节点数组
  return proxies;
}
