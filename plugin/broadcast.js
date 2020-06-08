//广播插件
let broadcast = new Object();

//设置容器
broadcast.container = {};

/**
 * 设置接收端
 * @param name 接收名
 * @param comObj  组件对象
 * @param fun 调用函数
 */
broadcast.setReceive = function(name, comObj, fun){
    let obj = this.container[name];
    if(!obj){
        this.container[name] = [];
    }
    if(fun && fun.constructor === String){
        fun =  comObj[fun];
    }
    this.container[name].push({
        name: name,
        com: comObj,
        fun: fun
    });
}

/**
 * 发送
 * @param name
 * @param arr
 */
broadcast.send = function (name, ...arr) {
    let obj = this.container[name];
    if(obj){
        for(let o of obj){
            let fun = o.fun;
            if(fun && fun.constructor === Function){
                fun.apply(o.com, arr);
            }
        }
    }
};

//添加引入组件执行函数
broadcast.install = function (main) {
    let that = this;

    //增加加载组件完成运行函数
    main.addComponentLoadRuns(function (com) {
        com.$broadcast = that;
    });
}
output = broadcast;


