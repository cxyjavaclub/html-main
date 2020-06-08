//添加路径处理插件
let path = new Object();

//替换条件对象
path.condition = [
    {name: 'a', value: 'href'},
    {name: 'img', value: 'src'}
];

/**
 * 设置条件
 *  条件属性：
 *  name:标签
 *  value:属性名
 * @param obj 可以是对象或者数组
 */
path.setCondition = function(obj){
    if(obj){
        if(obj.constructor === Object){
            this.condition.push(obj);
        }else if(obj.constructor === Array){
            for(let o of obj){
                this.condition.push(o);
            }
        }
    }
}

/**
 * 判断条件是否成立
 * @param name
 * @param value
 * @returns {boolean}
 */
path.isCondition = function (name, value) {
    for(let o of this.condition){
        if(o.name === name && o.value === value){
            return true;
        }
    }
    return false;
};

/**
 * 设置别名,别名已~号开头
 * @param obj
 */
path.setAlias = function(obj){
    if(obj){
        this.alias = obj;
    }else{
        this.alias = {};
    }
}

/**
 * 查找别名
 * @param name
 * @returns {null|unknown}
 */
path.findAlias = function (name) {
    if(name && this.alias && this.alias.constructor === Object){
        name = name.replace(/^~/, '');
        for(let [n, value] of Object.entries(this.alias)){
            if(name === n){
                return value;
            }
        }
    }
    return null;
};

/**
 * 处理路径@符号，@为代表项目路径
 * @param path
 */
path.disposeAt = function(path){
    return path.replace(/^@/, this.projectPath);
}

/**
 * 处理路径~符号，@为代表别名，
 * @param path
 */
path.disposeBLH = function(path){
    if(path) {
        let arr = /^~[^\/]*/.exec(path);
        if (arr && arr.length > 0) {
            let name = arr[0];
            let value = this.findAlias(name);
            if (value) {
                let v = this.disposeAt(value);
                path = path.replace(name, v);
            }
        }
    }
    return path;
}


path.pathDispose = function(path){
    if(path) {
        let charAt = path.charAt(0);
        if (charAt === '~') {
            path = this.disposeBLH(path);
        }
        if (charAt === '@') {
            path = this.disposeAt(path);
        }
    }
    return path;
}

/**
 * 处理路径记过
 * @param dom
 * @param attr
 * @param v
 */
path.disposeAttrValue = function (dom, attr, v) {
    if(dom && attr && v && v.value) {
        let name = dom.tagName.toLocaleLowerCase();
        let attrName = attr.name;
        //这里修改路径处理条件
        if (this.isCondition(name, attrName)) {
            let value = v.value.trim();
            v.value = this.pathDispose(value);
        }
    }
};

//添加引入组件执行函数
path.install = function(main){
    let that = this;
    this.main = main;
    main.path = path;
    this.projectPath = main.projectPath;

    //增强组件的load方法
    let load = main.load;
    main.load = function (href) {
        href = that.pathDispose(href);
        return load(href);
    }
    main.global.input = main.input;

    //增加解析普通属性之前运行
    main.addParseOrdinaryAttrBeforeRuns(function (attr, dom) {
        that.disposeAttrValue(dom, attr, attr);
    });

    //增加解析m-attr属性之前运行
    main.addParseMAttrAttrBeforeRuns(function (type, o, attr, dom) {
        let a = null;
        if(attr && attr.name){
            a = {};
            a.name = attr.name.replace('m-attr:', '');
        }
        that.disposeAttrValue(dom, a, o);
    });

    //引入路径（组件input属性的css和js）之前运行
    main.addIntroducePathBeforeRuns(function (type, o) {
        if(o){
            o.value = that.pathDispose(o.value);
        }
    })
}
output = path;