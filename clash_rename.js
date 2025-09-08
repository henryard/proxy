/*
 * Clash Meta 节点重命名与过滤脚本
 *
 * 功能:
 * 1. 过滤掉包含特定关键字的节点 (如官网、流量信息等)
 * 2. 按指定格式重命名节点: 国旗 国家中文名称 序号
 * 3. 按指定优先级排序: 香港, 台湾, 日本, 韩国, 新加坡, 美国, 其他...
 * 4. 包含主流国家和地区的匹配规则
 */
function main(proxies) {
  // --- 新增功能：节点名称过滤 ---
  // 定义需要过滤掉的关键字 (不区分大小写)
  const filterKeywords = [
    '永久', '官网', '到期', '重置', '套餐', '失联', '公益', '剩余', '所有', 
    '邮箱', '硬盘服', '资源服', '教学服', '69云', '频道', '导航', '更新', 
    '更换', '流量', '故障', '用户', '网站', '正在处理', '异常', '近期', '今日'
  ];
  
  // 使用 Array.prototype.filter() 方法创建新的节点数组
  // 这个新数组将只包含名称中“不”含任何过滤关键字的节点
  const filteredProxies = proxies.filter(proxy => {
    const proxyNameLower = proxy.name.toLowerCase();
    // .some() 方法会检查数组中是否至少有一个元素满足条件
    // 我们在前面加上 ! (非)，表示“不满足”这个条件的节点才会被保留
    return !filterKeywords.some(keyword => proxyNameLower.includes(keyword.toLowerCase()));
  });

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

  // --- 注意：后续所有操作都基于过滤后的 filteredProxies 数组 ---

  // 第一步: 为每个节点找到匹配的规则并打上标记
  filteredProxies.forEach(proxy => {
    const proxyNameLower = proxy.name.toLowerCase();
    for (const rule of countryRules) {
      if (rule.keywords.some(keyword => proxyNameLower.includes(keyword))) {
        proxy.matchedRule = rule;
        return;
      }
    }
  });

  // 第二步: 根据匹配规则的 sort 属性对节点进行排序
  filteredProxies.sort((a, b) => {
    if (a.matchedRule && b.matchedRule) {
      return a.matchedRule.sort - b.matchedRule.sort;
    }
    if (a.matchedRule) return -1;
    if (b.matchedRule) return 1;
    return 0;
  });

  // 第三步: 遍历排序后的节点, 进行重命名和编号
  const counters = {};
  filteredProxies.forEach(proxy => {
    if (proxy.matchedRule) {
      const rule = proxy.matchedRule;
      const countryName = rule.name;
      
      counters[countryName] = (counters[countryName] || 0) + 1;
      const number = String(counters[countryName]).padStart(2, '0');
      
      proxy.name = `${rule.flag} ${countryName} ${number}`;
    }
  });

  // 返回处理后的节点列表
  return filteredProxies;
}
