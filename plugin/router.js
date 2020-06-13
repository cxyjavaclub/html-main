//添加路由插件
function router(obj){
    this.routes = [];
    if(obj && obj.constructor === Object){
        let that = this;
        /**
         * 配置路由信息
         * routes为数组，数组里是路由对象
         * 路由对象：
         *      属性：
         *      path：路径
         *      component：组件 可以是组件路径可以提高初次加载速度，在使用路由是再向服务器发送请求
         *      redirect：重定向
         * 路由对象提供两个可调用生命周期：
         *      deactivated：停用
         *      activated：活化
         * 注意：第一条为默认路由
         */
        if(obj.routes && obj.routes.constructor === Array){
            this.routes = obj.routes;
        }

        /**
         * 自定义生成的路由组件名称
         */
        if(obj.name){
            this.name = obj.name;
        }else{
            this.name = 'router-view';
        }
        /**
         * 自定义生成的路由组件模板
         */
        if(obj.template){
            this.template = obj.template;
        }else{
            this.template = '';
        }
        /**
         * 历史记录对象
         * @type {}
         */
        this.historyObjStorage = {};

        /**
         * 本次路由携带参数
         * @type {null}
         */
        this.query = null;

        /**
         * 浏览器全局对象
         */
        if(obj.global){
            this.global = obj.global;
        }else{
            this.global = window;
        }

        /**
         * 窗口的浏览历史对象
         */
        if(obj.history){
            this.history = obj.history;
        }else{
            this.history = this.global.history;
        }
        /**
         * 添加history的popstate 事件
         */
        this.global.onpopstate = function (event) {
            let objToken = event.state;
            if(objToken && objToken.token && objToken.token.constructor === String){
                let objTokenObj = that.historyObjStorage[objToken.token];
                if(objTokenObj){
                    that.hideShowRouter();
                    //路由添加视图
                    that.main.MainTool.methods.insertAfter(objTokenObj.com.elDom, that.elDom);
                    //路由添加视图样式
                    that.main.MainTool.methods.addStyleLabelToHead(objTokenObj.com.style.obj);
                    that.query = objTokenObj.query;
                    that.routes[objTokenObj.index].componentObj = objTokenObj.com;
                    that.showRouter =  that.routes[objTokenObj.index];
                    that.index = objTokenObj.index;
                    that.path = objTokenObj.path;
                    //调用路由生命周期活化事件
                    if(that.showRouter.componentObj.activated){
                        that.showRouter.componentObj.activated();
                    }
                }
            }
        }
    }
}
//路由配置表初始化
router.prototype.routeInit = function(){
    if(this.routes.length > 0){
        let obj = [];
        for(let route of this.routes){
            if(route && route.constructor === Object && route.path && (route.component || route.redirect)){
                let com = route.component;
                if(com){
                    if(com.constructor === Object) {
                        this.main.MainTool.methods.initComponent(com.name || 'router', com);
                    }
                }else{
                    let redirect = route.redirect;
                    let com1 = null;
                    for(let r of this.routes){
                        if(r != route && r.path === redirect){
                            com1 = r.component;
                            break;
                        }
                    }
                    if(com1){
                        route.component = com1;
                    }
                }
                if(route.component){
                    obj.push(route);
                }
            }
        }
        this.routes = obj;
    }
}

/**
 * 设置路径
 * @param path
 */
router.prototype.pushState = function(obj, path){
    let objToken = 'history-obj-storage-' + this.main.MainTool.methods.getUUid(16);
    this.historyObjStorage[objToken] = obj;
    this.history.pushState({token: objToken}, "", path)
}

/**
 * 通过路径查找路由表下标
 * @param path
 * @returns {number}
 */
router.prototype.findByPathIndex = function(path){
    if(this.routes) {
        for (let i = 0; i < this.routes.length; i++) {
            if (this.routes[i].path === path) {
                return i;
            }
        }
    }
}

//隐藏显示路由
router.prototype.hideShowRouter = function () {
    if(this.showRouter){
        try {
            let s = this.showRouter;
            this.main.MainTool.methods.removeLabelElement(s.componentObj.elDom);
            this.main.MainTool.methods.removeLabelElement(s.componentObj.style.obj);
            //调用路由生命周期停用事件
            if (s.componentObj.deactivated) {
                s.componentObj.deactivated();
            }
            delete s.componentObj;
            //清除本次路由携带的参数
            this.query = null;
        }catch (e) {
            console.error("隐藏路由错误：==>", e);
        }
    }
};

/**
 * 通过下标选择路由
 * @param i 下标
 * @param query 携带参数
 * @param historyFlag 历史标志
 */
router.prototype.selectIndex = function(i, query, historyFlag){
    if(this.routes.length > 0 && this.elDom && i >= 0 && i < this.routes.length){
        let that =this;
        let route = this.routes[i];
        let comPrototype = this.routes[i].component;
        this.hideShowRouter();
        //在组件解析之前添加携带参数
        if(query){
            //增加携带参数
            this.query = query;
        }
        //当组件是路径时引入组件，减少初次组件加载时间
        if(comPrototype.constructor === String){
            let c = this.main.input(comPrototype);
            this.main.MainTool.methods.initComponent(c.name || 'router', c);
            this.routes[i].component = comPrototype = c;
        }
        //解析组件
        let com = this.main.MainTool.methods.completeParseComponent(comPrototype, null, null, function (com) {
            //路由添加视图
            that.main.MainTool.methods.insertAfter(com.elDom, that.elDom);
        });

        //路由添加视图样式
        let styleLabelObj = this.main.MainTool.methods.addStyleToHead(com.style.value);
        //添加视图样式标签对象
        com.style.obj = styleLabelObj;

        //调用路由生命周期活化事件
        if(com.activated){
            com.activated();
        }
        route.componentObj = com;
        this.showRouter = route;
        this.index = i;
        this.path = route.path;
        if(historyFlag) {
            //设置路径
            this.pushState({com: com, query: this.query, index: i, path: route.path}, route.path);
        }
    }else{
        if(i != this.index){
            console.error('路由为空或不存在这个下标的路由');
        }
    }
}


//通过路径路由 有历史记录
router.prototype.goPath = function (obj){
    this.routerPath(obj, true);
}

//替换路由，没有历史记录
router.prototype.replace = function(obj){
    this.routerPath(obj, false);
}

/**
 * 路由路径
 * @param obj
 * @param historyFlag
 */
router.prototype.routerPath = function(obj, historyFlag){
    if(obj.constructor === String){
        this.selectIndex(this.findByPathIndex(obj), null, historyFlag);
    }else if(obj.constructor === Object){
        if(obj.path){
            this.selectIndex(this.findByPathIndex(obj.path), obj.query, historyFlag);
        }else{
            console.error('没有路由路径');
        }
    }
}


//刷新路由
router.prototype.refresh = function () {
    this.selectIndex(this.index, this.query, false);
};

//路由移动到上一个网址，等同于点击浏览器的后退键。对于第一个访问的网址，该方法无效果。
router.prototype.back = function () {
    this.history.back();
};

//路由移动到下一个网址，等同于点击浏览器的前进键。对于最后一个访问的网址，该方法无效果。
router.prototype.forward = function () {
    this.history.forward();
};

//路由接受一个整数作为参数，以当前网址为基准，移动到参数指定的网址，比如go(1)相当于forward()，
// go(-1)相当于back()。如果参数超过实际存在的网址范围，该方法无效果；如果不指定参数，默认参数为0，
// 相当于刷新当前页面
router.prototype.go = function (i) {
    if((!i) || i === 0){
        this.refresh();
    }else{
        this.history.go(i);
    }
};

//设置默认路径
router.prototype.default = function(path){
    console.log(path)
    this.defaultPath = path;
}

//添加引入组件执行函数
router.prototype.install  = function (main) {

    let that = this;

    //想插件添加组件构造对象
    this.main = main;

    //路由配置表初始化
    this.routeInit();

    //检测路由表
    if(this.routes.length > 0) {

        //增加双向绑定数据
        main.MainTool.methods.dataHijack(this, 'path', this.path);

        //插件令牌（用于判别组件）
        this.token = 'router-token-' + main.MainTool.methods.getUUid(16);

        //增加组件
        main.component(this.name, {token: this.token, template: this.template});
        //添加链接组件
        main.component('router-link', {
            style:{
                value: `a{
                        text-decoration: none;
                        color: #232323;
                        }`,
                scoped: true
            },
            template: `<a><slot></slot></a>`,
        });

        //增加组件被创造完成运行
        main.addComponentCreatedLoadRuns(function (com) {
            if(com.token !== that.token) {
                if (!com.$router) {
                    main.MainTool.methods.dataHijack(com, '$router', that, true);
                } else {
                    //防止一个路由重复添加
                    if (com.$router !== that) {
                        if (com.$router.constructor === Array) {
                            com.$router.push(that);
                        } else {
                            let t = com.$router;
                            com.$router = [];
                            com.$router.push(t);
                            com.$router.push(that);
                        }
                    }
                }
            }
        })

        //增加组件加载完成并添加dom运行
        main.addComponentAddDomLoad(function (com) {
            if (com.token && com.token === that.token) {
                that.elDom = com.elDom;
                if(that.defaultPath){
                    let index = 0;
                    if(that.defaultPath.constructor === String){
                        index = that.findByPathIndex(that.defaultPath);
                    }else if(that.defaultPath.constructor === Number && that.defaultPath >= 0 && that.defaultPath < that.routes.length){
                        index = that.defaultPath;
                    }
                    if(index){
                        that.selectIndex(index, null, true);
                        return;
                    }
                }else {
                    if(main.pathName){
                        let arr = split(main.pathName, '/');
                        if(arr.length > 0){
                            let index = that.findByPathIndex('/' + arr[0]);
                            if(index){
                                that.selectIndex(index, null, true);
                                return;
                            }
                        }
                    }
                }
                that.selectIndex(0, null, true);
            }
        });

        //框架解析普通标签完成运行，增加解析a的m-link属性
        main.addParseOrdinaryLabelLoadRuns(function (dom) {
            if(dom){
                let name = dom.tagName.toLocaleLowerCase();
                //解析a标签m-link属性
                if(name === 'a'){
                    let link = dom.getAttribute('m-link');
                    if(link){
                        dom.setAttribute('href', link);
                        dom.removeAttribute('m-link');
                    }
                }
            }

        });

    }else{
        console.error('路由表为空，路由插件添加失败');
    }
}

function split(str, re){
    let arr = []
    if(str) {
        for (let s of str.split(re)) {
            if (s) {
                arr.push(s)
            }
        }
    }
    return arr;
}
output = router;

