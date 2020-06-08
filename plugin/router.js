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
                        //向组件原型添加路由对象
                        com.$router = this;
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
        let s = this.showRouter;
        this.main.MainTool.methods.removeLabelElement(s.componentObj.elDom);
        this.main.MainTool.methods.removeLabelElement(s.componentObj.style.obj);
        //调用路由生命周期停用事件
        if(s.componentObj.deactivated){
            s.componentObj.deactivated();
        }
        delete s.componentObj;
        //清除本次路由携带的参数
        this.query = null;
    }
};

/**
 * 通过下标选择路由
 * @param i 下标
 * @param query 携带参数
 * @param refreshFlag 刷新标志
 */
router.prototype.selectIndex = function(i, query, refreshFlag){
    if(this.routes.length > 0 && this.elDom && i >= 0 && i < this.routes.length){
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
            //向组件原型添加路由对象
            c.$router = this;
            this.routes[i].component = comPrototype = c;
        }
        //解析组件
        let com = this.main.MainTool.methods.parseComponent(comPrototype);

        //路由添加视图
        this.main.MainTool.methods.insertAfter(com.elDom, this.elDom);
        //路由添加视图样式
        let styleLabelObj = this.main.MainTool.methods.addStyleToHead(com.style.value);
        //添加视图样式标签对象
        com.style.obj = styleLabelObj;
        route.componentObj = com;
        this.showRouter = route;
        this.index = i;
        this.path = route.path;
        if(!refreshFlag) {
            //设置路径
            this.pushState({com: com, query: this.query, index: i, path: route.path}, route.path);
        }
    }else{
        if(i != this.index){
            console.error('路由为空或不存在这个下标的路由');
        }
    }
}


//通过路径路由
router.prototype.goPath = function (obj){
    if(obj.constructor === String){
        this.selectIndex(this.findByPathIndex(obj));
    }else if(obj.constructor === Object){
        if(obj.path){
            this.selectIndex(this.findByPathIndex(obj.path), obj.query);
        }else{
            console.error('没有路由路径');
        }
    }
}


//刷新路由
router.prototype.refresh = function () {
    this.selectIndex(this.index, null, true);
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

//添加引入组件执行函数
router.prototype.install  = function (main) {

    let that = this;

    //想插件添加组件构造对象
    this.main = main;

    //路由配置表初始化
    this.routeInit();

    //检测路由表
    if(this.routes.length > 0) {

        //插件令牌（用于判别组件）
        this.token = 'router-token-' + main.MainTool.methods.getUUid(16);

        //增加组件
        main.component(this.name, {token: this.token, template: this.template});

        //增加加载组件原型完成运行函数
        main.addComponentPrototypeLoadRuns(function (comPrototype) {
            if(comPrototype.token !== that.token) {
                if (!comPrototype.$router) {
                    comPrototype.$router = that;
                } else {
                    //防止一个路由重复添加
                    if (comPrototype.$router !== that) {
                        if (comPrototype.$router.constructor === Array) {
                            comPrototype.$router.push(that);
                        } else {
                            let t = comPrototype.$router;
                            comPrototype.$router = [];
                            comPrototype.$router.push(t);
                            comPrototype.$router.push(that);
                        }
                    }
                }
            }
        })

        //增加组件加载完成并添加dom运行
        main.addComponentAddDomLoad(function (com) {
            if (com.token && com.token === that.token) {
                that.elDom = com.elDom;
                that.selectIndex(0);
            }
        });
    }else{
        console.error('路由表为空，路由插件添加失败');
    }
}
output = router;

