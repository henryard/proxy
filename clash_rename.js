// mysub_rename.js
// @author Gemini

function operator(proxies) {
    // 1. 节点过滤 (Exclusion)
    const excludeKeywords = /永久|官网|到期|重置|套餐|失联|公益|剩余|所有|邮箱|硬盘服|资源服|教学服|69云|频道|导航|更新|更换|流量|故障|用户|网站|正在处理|异常|近期|今日/;
    proxies = proxies.filter(p => !excludeKeywords.test(p.name));

    // 2. 节点重命名 & 提取国家/地区信息
    const countryMap = {
        'HK': '香港', 'Hong Kong': '香港',
        'TW': '台湾', 'Taiwan': '台湾',
        'JP': '日本', 'Japan': '日本',
        'KR': '韩国', 'Korea': '韩国',
        'SG': '新加坡', 'Singapore': '新加坡',
        'US': '美国', 'United States': '美国',
        // 可根据需要添加更多映射
    };

    let nodeCounters = {}; // 用于为每个国家/地区生成序号

    proxies.forEach(p => {
        let countryName = '其他';
        let countryCode = 'OTHER';

        // 简单的国家/地区匹配逻辑
        for (const key in countryMap) {
            if (p.name.toUpperCase().includes(key.toUpperCase())) {
                countryName = countryMap[key];
                countryCode = getCountryCode(countryName); // 获取一个统一的 Code 用于排序
                break;
            }
        }

        // 初始化或增加计数器
        if (!nodeCounters[countryCode]) {
            nodeCounters[countryCode] = 1;
        } else {
            nodeCounters[countryCode]++;
        }
        
        const flag = getFlag(countryCode); // 获取国旗 emoji
        const index = String(nodeCounters[countryCode]).padStart(2, '0'); // 序号补零，例如 01, 02

        // 重命名
        p.name = `${flag} ${countryName} ${index}`;
        
        // 为排序添加临时属性
        p.custom_sort_country = countryCode;
        p.custom_sort_index = parseInt(index, 10);
    });

    // 3. 节点排序
    const sortOrder = {
        'HK': 1,
        'TW': 2,
        'JP': 3,
        'KR': 4,
        'SG': 5,
        'US': 6,
        'OTHER': 7,
    };

    proxies.sort((a, b) => {
        const orderA = sortOrder[a.custom_sort_country] || 99;
        const orderB = sortOrder[b.custom_sort_country] || 99;

        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return a.custom_sort_index - b.custom_sort_index;
    });
    
    // 清理临时属性 (可选，但推荐)
    proxies.forEach(p => {
        delete p.custom_sort_country;
        delete p.custom_sort_index;
    });

    return proxies;
}

// --- 辅助函数 ---

// 根据国家/地区中文名获取统一的Code
function getCountryCode(name) {
    if (name === '香港') return 'HK';
    if (name === '台湾') return 'TW';
    if (name === '日本') return 'JP';
    if (name === '韩国') return 'KR';
    if (name === '新加坡') return 'SG';
    if (name === '美国') return 'US';
    return 'OTHER';
}

// 根据统一的Code获取国旗Emoji
function getFlag(countryCode) {
    const flags = {
        'HK': '🇭🇰',
        'TW': '🇹🇼',
        'JP': '🇯🇵',
        'KR': '🇰🇷',
        'SG': '🇸🇬',
        'US': '🇺🇸',
        'OTHER': '🌍',
    };
    return flags[countryCode] || '🏳️';
}
