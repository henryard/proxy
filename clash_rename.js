/*
 * Clash Meta 节点重命名脚本
 *
 * 功能:
 * 1. 按指定格式重命名节点: 国旗 国家中文名称 序号
 * 2. 按指定优先级排序: 香港, 台湾, 日本, 韩国, 新加坡, 美国, 其他...
 * 3. 包含主流国家和地区的匹配规则
 */
function main(proxies) {
  // 定义国家/地区的重命名规则
  // keywords: 用于匹配节点名称的关键字 (请使用小写)
  // name:     重命名后的中文名称
  // flag:     国旗 Emoji
  // sort:     排序优先级，数字越小越靠前
  const countryRules = [
    { keywords: ['hk', 'hong kong', 'hongkong', '港'], name: '香港', flag: '🇭🇰', sort: 1 },
    { keywords: ['tw', 'taiwan', '台湾', '臺湾', '台'], name: '台湾', flag: '🇹🇼', sort: 2 },
    { keywords: ['jp', 'japan', '日本', '日'], name: '日本', flag: '🇯🇵', sort: 3 },
    { keywords: ['kr', 'korea', '韩国', '韩'], name: '韩国', flag: '🇰🇷', sort: 4 },
    { keywords: ['sg', 'singapore', '新加坡', '狮城', '新'], name: '新加坡', flag: '🇸🇬', sort: 5 },
    { keywords: ['us', 'usa', 'united states', 'america', '美国', '美'], name: '美国', flag: '🇺🇸', sort: 6 },
    
    // -- 其他国家/地区 (sort 设为 99, 表示在上述指定国家之后) --
    { keywords: ['gb', 'united kingdom', 'kingdom', '英国', '英'], name: '英国', flag: '🇬🇧', sort: 99 },
    { keywords: ['de', 'germany', '德国', '德'], name: '德国', flag: '🇩🇪', sort: 99 },
    { keywords: ['fr', 'france', '法国', '法'], name: '法国', flag: '🇫🇷', sort: 99 },
    { keywords: ['ca', 'canada', '加拿大', '加'], name: '加拿大', flag: '🇨🇦', sort: 99 },
    { keywords: ['au', 'australia', '澳大利亚', '澳'], name: '澳大利亚', flag: '🇦🇺', sort: 99 },
    { keywords: ['nl', 'netherlands', '荷兰'], name: '荷兰', flag: '🇳🇱', sort: 99 },
    { keywords: ['ru', 'russia', '俄罗斯', '俄', '毛'], name: '俄罗斯', flag: '🇷🇺', sort: 99 },
    { keywords: ['in', 'india', '印度', '印'], name: '印度', flag: '🇮🇳', sort: 99 },
    { keywords: ['tr', 'turkey', '土耳其', '土'], name: '土耳其', flag: '🇹🇷', sort: 99 },
    { keywords: ['th', 'thailand', '泰国', '泰'], name: '泰国', flag: '🇹🇭', sort: 99 },
    { keywords: ['vn', 'vietnam', '越南', '越'], name: '越南', flag: '🇻🇳', sort: 99 },
    { keywords: ['ph', 'philippines', '菲律宾', '菲'], name: '菲律宾', flag: '🇵🇭', sort: 99 },
    { keywords: ['my', 'malaysia', '马来西亚', '大马'], name: '马来西亚', flag: '🇲🇾', sort: 99 },
    { keywords: ['id', 'indonesia', '印度尼西亚', '印尼'], name: '印尼', flag: '🇮🇩', sort: 99 },
    { keywords: ['ae', 'united arab emirates', '阿联酋'], name: '阿联酋', flag: '🇦🇪', sort: 99 },
    { keywords: ['ch', 'switzerland', '瑞士'], name: '瑞士', flag: '🇨🇭', sort: 99 },
    { keywords: ['se', 'sweden', '瑞典'], name: '瑞典', flag: '🇸🇪', sort: 99 },
    { keywords: ['it', 'italy', '意大利', '意'], name: '意大利', flag: '🇮🇹', sort: 99 },
    { keywords: ['es', 'spain', '西班牙'], name: '西班牙', flag: '🇪🇸', sort: 99 },
    { keywords: ['br', 'brazil', '巴西'], name: '巴西', flag: '🇧🇷', sort: 99 },
    { keywords: ['ar', 'argentina', '阿根廷'], name: '阿根廷', flag: '🇦🇷', sort: 99 },
    { keywords: ['za', 'south africa', '南非'], name: '南非', flag: '🇿🇦', sort: 99 },
    { keywords: ['mo', 'macau', 'macao', '澳门', '澳'], name: '澳门', flag: '🇲🇴', sort: 99 },
    // 可在此处继续添加更多规则...
  ];

  // 第一步: 为每个节点找到匹配的规则并打上标记
  proxies.forEach(proxy => {
    const proxyNameLower = proxy.name.toLowerCase();
    for (const rule of countryRules) {
      // 使用 some 方法判断是否有任何一个关键字匹配
      if (rule.keywords.some(keyword => proxyNameLower.includes(keyword))) {
        proxy.matchedRule = rule; // 将匹配到的规则对象附加到节点上
        return; // 找到第一个匹配后即可跳出, 防止澳门节点被澳大利亚规则覆盖
      }
    }
  });

  // 第二步: 根据匹配规则的 sort 属性对节点进行排序
  proxies.sort((a, b) => {
    // 如果 a, b 都有匹配规则, 则按 sort 值排序
    if (a.matchedRule && b.matchedRule) {
      return a.matchedRule.sort - b.matchedRule.sort;
    }
    // 如果只有 a 有匹配规则, a 排在前面
    if (a.matchedRule) {
      return -1;
    }
    // 如果只有 b 有匹配规则, b 排在前面
    if (b.matchedRule) {
      return 1;
    }
    // 如果都没有匹配规则, 保持原始相对顺序
    return 0;
  });

  // 第三步: 遍历排序后的节点, 进行重命名和编号
  const counters = {}; // 用于记录每个国家/地区的节点序号
  proxies.forEach(proxy => {
    if (proxy.matchedRule) {
      const rule = proxy.matchedRule;
      const countryName = rule.name;
      
      // 初始化或增加计数器
      counters[countryName] = (counters[countryName] || 0) + 1;
      
      // 格式化序号, 不足两位的在前面补 0 (例如: 1 -> 01)
      const number = String(counters[countryName]).padStart(2, '0');
      
      // 生成最终节点名称
      proxy.name = `${rule.flag} ${countryName} ${number}`;
    }
    // 对于没有匹配到任何规则的节点, 保持其原始名称不变
  });

  // 返回处理后的节点列表
  return proxies;
}
