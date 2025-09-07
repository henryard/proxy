/*
 * 【调试版本 B：最简化链路测试】
 */
function main(proxies) {
  // 如果 proxies 数组为空，直接返回
  if (!proxies || proxies.length === 0) {
    return proxies;
  }

  // 遍历所有节点，并在名字前加上 [TEST] 标志
  proxies.forEach(proxy => {
    proxy.name = "[TEST] " + proxy.name;
  });

  // 返回修改后的节点列表
  return proxies;
}
