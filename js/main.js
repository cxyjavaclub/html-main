;(function (global) {
    /**
     * 组件管理库
     * @param obj
     * @constructor
     * obj as Object
     * components：组件注册属性 as Object
     */
    function Main(obj) {
        let com = Main.MainTool.methods._init(obj);
        //添加样式
        if (com.style && com.style.value) {
            Main.MainTool.methods.addStyleToHead(com.style.value);
        }
        return com;
    }

    /**
     * 添加一下自定义属性
     */
    (function () {
        //全局组件存储
        Main.globalComponents = [];
        //组件加载完成运行
        Main.componentLoadRuns = [];
        //组件原型解析完成运行
        Main.componentPrototypeLoadRuns = [];
        //框架解析普通标签之前运行
        Main.parseOrdinaryLabelBeforeRuns = [];
        //框架解析普通标签完成运行
        Main.parseOrdinaryLabelLoadRuns = [];
        //框架解析普通属性之前运行
        Main.parseOrdinaryAttrBeforeRuns = [];
        //框架解析m-attr属性之前运行
        Main.parseMAttrAttrBeforeRuns = [];
    })();

    /**
     * 注册全局组件
     * @param com
     */
    Main.component = function (name, com) {
        //初始化组件
        Main.MainTool.methods.initComponent(name, com);
        //写入全局组件
        Main.globalComponents[name] = com;
    };

    /**
     * 添加组件加载完成运行函数
     * @param fun
     */
    Main.addComponentLoadRuns = function(fun){
        Main.componentLoadRuns.push(fun);
    }
    /**
     * 添加组件解析完成运行函数
     * @param fun
     */
    Main.addComponentPrototypeLoadRuns = function(fun){
        Main.componentPrototypeLoadRuns.push(fun);
    }

    /**
     * 添加框架解析普通标签之前运行
     * @param fun
     */
    Main.addParseOrdinaryLabelBeforeRuns = function(fun){
        Main.parseOrdinaryLabelBeforeRuns.push(fun);
    }

    /**
     * 框架解析普通标签完成运行
     * @param fun
     */
    Main.addParseOrdinaryLabelLoadRuns = function(fun){
        Main.parseOrdinaryLabelLoadRuns.push(fun);
    }
    /**
     * 框架解析普通属性之前运行
     * @param fun
     */
    Main.addParseOrdinaryAttrBeforeRuns = function(fun){
        Main.parseOrdinaryAttrBeforeRuns.push(fun);
    }
    /**
     * 框架解析m-attr属性之前运行
     * @param fun
     */
    Main.addParseMAttrAttrBeforeRuns= function(fun){
        Main.parseMAttrAttrBeforeRuns.push(fun);
    }

    /**
     * 添加插件
     * @param plugin
     */
    Main.use = function (plugin) {
        //插件初始化
        plugin.install(Main);
    }

    /**
     * 订阅器
     * @constructor
     */
    Main.Dep = function() {
        //订阅者容器
        this.subs = [];
        //增加一个订阅者
        this.addSub = function (sub) {
            this.subs.push(sub);
        };
        //运行所有的订阅者
        this.runAll = function () {
            this.subs.forEach(function (obj) {
                obj.run();
            })
        }
    };

    /**
     * 订阅者
     * @param data
     * @param name
     * @param fun
     * @constructor
     */
    Main.Subscriber = function(data, name, fun) {
        //数据对象
        this.data = data;
        //数据名称
        this.name = name;
        //运行函数
        this.fun = fun;
        //添加到订阅器
        this.get = function () {
            Main.Dep.objValue = data;
            Main.Dep.value = this;
            let value = data[name];
            Main.Dep.value = null;
            Main.Dep.objValue = null;
            return value;
        }
        this.run = function () {
            let v = this.data[name];
            if (this.value != v || v.constructor === Array) {
                this.value = v;
                this.fun();
            }
        }
        //执行添加订阅器
        this.value = this.get();
    }

    /**
     * 组件原型
     */
    let MainPrototypes = {
        //选择器
        el: null,

        //dom标签对象
        elDom: null,

        //组件值传递挂载对象
        props: {},

        //所有的子组件
        children: {},

        //父组件
        parent: null,

        // 子组件dom
        childrenDom: new Map(),

        //数据集
        data: function () {
            return {};
        },
        //存储ref名称dom集合
        $refs: function () {
            return {};
        },

        //存储插槽对象
        $slots: function () {
            return {};
        },

        //计算属性
        computes: {},

        //发送事件函数
        $emit: function (name, ...arr) {
            if (this.$emits[name]) {
                this.$emits[name].apply(this, arr);
            }
        },

        //自定义事件集合
        $emits: function () {
            return {};
        },

        // 样式属性
        style: {
            scoped: true, //局部css样式
            value: '' //样式内容
        },

        //html模板
        template: '',

        //事件加载完成运行函数
        mounted: function () {

        },
        //渲染组件之前运行的运行函数
        created: function () {

        },

        //组件相关函数对象
        methods: {}
    }


    /**
     * 组件解析工具
     */
    Main.MainTool = {
        //方法
        methods: {
//===========================================================================
            /**
             * 组件初始化
             * @param obj
             */
            //将组件里的子组件转换为组件原型
            childComponentToPrototypes: function (newCom) {
                for (const [name, value] of Object.entries(newCom.children)) {
                    let com = this.mergeConfig(value);
                    newCom.children[name] = com;
                }
            },

            /**
             * 组件重组
             * @param obj
             */
            mergeConfig: function (obj) {

                //添加el
                if (!obj.el) {
                    obj.el = null;
                }

                //添加elDom
                if (!obj.elDom) {
                    obj.elDom = null;
                }
                //组件值传递挂载对象
                if (!obj.props) {
                    obj.$props = {};
                }

                //所有的子组件
                //将components写入children属性
                if (obj.components) {
                    obj.children = obj.components;
                    delete obj.components
                } else {
                    obj.children = [];
                }

                //父组件
                obj.parent = null;

                // 子组件dom
                obj.childrenDom = function () {
                    return new Map();
                }

                //数据集
                if (!obj.data) {
                    obj.data = function () {
                        return {};
                    }
                }

                //存储ref名称dom集合
                obj.$refs = function () {
                    return {};
                }

                //存储插槽对象
                obj.$slots = function () {
                    return {};
                }

                //计算属性
                if (!obj.computes) {
                    obj.computes = {};
                }

                //发送事件函数
                obj.$emit = function (name, ...arr) {
                    if (this.$emits[name]) {
                        this.$emits[name].apply(this, arr);
                    }
                }

                //自定义事件集合
                obj.$emits = function () {
                    return {};
                }

                // 样式属性
                if (!obj.style) {
                    obj.style = {
                        scoped: true, //局部css样式
                        value: '' //样式内容
                    };
                }

                //html模板
                if (!obj.template) {
                    obj.template = '';
                }

                //事件加载完成运行函数
                if (!obj.mounted) {
                    obj.mounted = function () {
                    };
                }

                //渲染组件之前运行的运行函数
                if (!obj.created) {
                    obj.created = function () {
                    };
                }

                //组件相关函数对象
                if (!obj.methods) {
                    obj.methods = {};
                }
            },

            /**
             * 初始化组件,提取组件原型
             * @param newCom
             */
            initComponent: function (name, newCom) {
                //合并配置并生成新的组件
                this.mergeConfig(newCom);

                //当组件没有name时生成name
                if(!newCom.name){
                    newCom.name = name;
                }

                //检测组件是否嵌套
                for (const [name, value] of Object.entries(newCom.children)) {
                    this.initComponent(name, value);
                }

                //组件样式初始化
                this.componentStyleInit(newCom);

                /**
                 * 解析生成dom元素
                 */
                //检测模板
                if (newCom.template) {
                    newCom.elDom = this.parseTemplate(newCom.template);
                }
                //检测el
                if (newCom.el) {
                    let elDom = this.verifyElReturnDom(newCom.el);
                    if (elDom) {
                        if (newCom.elDom) {
                            //把el dom 替换为模板dom
                            elDom.parentNode.replaceChild(newCom.elDom, elDom);
                        } else {
                            newCom.elDom = elDom;
                        }
                    }
                }
                //组件原型解析完成运行
                this.componentPrototypeLoad(newCom);
            },
//======================================================================

            /**
             * 组件数据this化
             * @param storageObj
             */
            componentDataThisChange: function (storageObj) {
                for (const [name, value] of Object.entries(storageObj)) {
                    if (name === 'data' || name === 'methods'  || name === '$props') {
                        for (const v in value) {
                            this.resetComponentKeys(storageObj, name, v);
                        }
                    }
                }
            },

            /**
             * 组件对象重置
             * @param storageObj
             */
            resetComponentObj: function (storageObj) {
                for (const [name, value] of Object.entries(storageObj)) {
                    if (name === 'data' || name === '$props') {
                        this.observe(value);
                        for (const v in value) {
                            this.rewriteArrayPrototypeFun(value[v], value, v)
                        }
                    }
                }
                this.resetComponentComputes(storageObj);
                for (const [name] of Object.entries(storageObj.computes)) {
                    this.resetComponentKeys(storageObj, 'computes', name);
                }
            },

            /**
             * 引入组件添加的css文件和js
             * @param comObj
             */
            inputJsAndCssUrl: function (comObj) {
                if (comObj) {
                    let input = comObj.input;
                    if (input) {
                        this.inputCssOrJs(input.css, 0);
                        this.inputCssOrJs(input.js, 1);
                    }
                }
            },

            /**
             * 引入js或css
             * @param value
             * @param type 1: js 0:css
             */
            inputCssOrJs: function (value, type) {
                if (value) {
                    if (value.constructor === String) {
                        value = [value];
                    }
                    if (value.constructor === Array) {
                        let head = document.querySelector('head');
                        let labelName = type === 0 ? 'link' : 'script';
                        for (const s of value) {
                            let label = this.createLabel(labelName);
                            if (type === 0) {
                                label.setAttribute('rel', 'stylesheet');
                                label.setAttribute('href', s);
                            } else if (type === 1) {
                                label.setAttribute('type', 'text/javascript');
                                label.setAttribute('src', s);
                            }
                            head.appendChild(label);
                        }
                    }
                }
            },

            /**
             * 框架解析普通标签之前运行
             * @param dom  dom元素
             * @param comObj 组件对象
             */
            parseOrdinaryLabelBefore: function (dom, comObj) {
                //框架解析普通标签之前运行
                for (const p of Main.parseOrdinaryLabelBeforeRuns) {
                    p(dom, comObj);
                }
            },

            /**
             * 框架解析普通标签完成运行
             * @param dom  dom元素
             * @param comObj 组件对象
             */
            parseOrdinaryLabelLoad: function (dom, comObj) {
                //框架解析普通标签完成运行
                for (const p of Main.parseOrdinaryLabelLoadRuns) {
                    p(dom, comObj);
                }
            },

            /**
             * 框架解析m-attr属性之前运行
             * @param type 0:普通html标签， 1：组件标签
             * @param o    携带已解析的值为对象对象里只有一个属性就是value
             * @param attr 经过属性加工厂加工过的属性 可能为空
             * @param dom  dom元素
             * @param comObj 组件对象
             */
            parseMAttrAttrBefore: function (type, o, attr, dom, comObj) {
                //框架解析m-attr属性之前运行
                for (const p of Main.parseMAttrAttrBeforeRuns) {
                    p(type, o, attr, dom, comObj);
                }
            },

            /**
             * 框架解析普通属性之前运行
             * @param attr 经过属性加工厂加工过的属性 可能为空
             * @param dom dom元素
             * @param comObj 组件对象
             */
            parseOrdinaryAttrBefore: function (attr, dom, comObj) {
                //框架解析普通属性之前运行
                for (const p of Main.parseOrdinaryAttrBeforeRuns) {
                    p(attr, dom, comObj);
                }
            },
            /**
             * 组件解析之前完成
             */
            componentParseFront: function (comObj) {
                if (comObj.created) {
                    comObj.created();
                }
            },

            /**
             * 组件原型解析完成运行
             * @param comObjPrototype
             */
            componentPrototypeLoad: function (comObjPrototype) {
                //运行组件原型解析完成运行
                for (const p of Main.componentPrototypeLoadRuns) {
                    p(comObjPrototype);
                }
            },
            /**
             * 组件加载完成
             * @param comObj
             */
            componentLoad: function (comObj) {
                if (comObj.mounted) {
                    comObj.mounted();
                }
            },

            /**
             * 组件解析且添加到dom完成
             * @param comObj
             */
            componentAddDomLoad: function(comObj){
                this.inputJsAndCssUrl(comObj);
                //运行组件加载完成运行函数
                for (const p of Main.componentLoadRuns) {
                    p(comObj);
                }
                comObj.$root = Main.$root;
            },

            /**
             * 解析生成新的组件
             * @param obj
             * @param type 为假时添加全局组件
             * @returns {{}}
             * @private
             */
            _init: function (obj) {
                let newCom = obj;
                //初始化组件
                this.initComponent('showMain', newCom);

                //通过组件原型生成组件
                newCom = this.findPrototypeCreateComponent(newCom);

                //解析组件m-if
                let mIfFlag = this.parseComponentMIF(newCom);
                // //解析所有的类型标签
                if (mIfFlag) {
                    Main.$root = newCom;

                    //首先隐藏
                    let dom = document.createTextNode('');

                    //替换标签
                    this.replaceLabelElement(dom, newCom.elDom);

                    //组件数据this化
                    this.componentDataThisChange(newCom);

                    //组件解析之前完成
                    this.componentParseFront(newCom);

                    //组件重置
                    this.resetComponentObj(newCom);

                    //解析所有的类型标签
                    this.parseAllTypeLabel(newCom.elDom, newCom);

                    //组件加载完成
                    this.componentLoad(newCom);

                    //组件解析且添加到dom完成
                    this.componentAddDomLoad(newCom);

                    //解析完成显示
                    this.replaceLabelElement(newCom.elDom, dom);
                    Main.$root = null;
                }
                return newCom;
            },

            /**
             * 解析组件dom的子dom
             * @param dom 必须为普通的html dom
             * @param newCom 组件对象
             * @param ifArr m-if已经解析过的标签
             */
            parseComponentDomChild: function (dom, newCom, ifArr) {
                if (dom) {
                    let child = dom.childNodes;
                    for (let i = 0; i < child.length; i++) {
                        //#text是文本
                        //#comment是注释文本
                        if (child[i].nodeName != '#text' && child[i].nodeName != '#comment') {
                            if (!this.arrayFind(ifArr, child[i])) {
                                //解析所有的类型标签
                                this.parseAllTypeLabel(child[i], newCom, null, function (com) {
                                    //组件模板替换
                                    this.componentTemplateReplace(dom, com.elDom, child[i]);
                                }, null, function (obj) {
                                    i += obj.num == 0 ? -1 : obj.num - 1;
                                });
                            }
                        }
                    }
                }
            },

            /**
             * 查找数组
             * @param arr
             * @param findObj
             * @returns {boolean}
             */
            arrayFind: function (arr, findObj) {
                for (let a of arr) {
                    if (a.el === findObj) {
                        return true;
                    }
                }
                return false;
            },
            /**
             * 解析所有的类型标签
             * 标签分类：
             *  1.普通html标签
             *  2.组件标签
             *  3.插槽标签
             * @param dom  dom标签
             * @param comObj  组件对象
             * @param funSlot slot插槽运行函数
             * @param funCom   组件运行函数
             * @param funHtml  普通html运行函数
             * @param funMFor  m-for运行函数运行函数
             */
            parseAllTypeLabel: function (dom, comObj, funSlot, funCom, funHtml, funMFor) {
                if (dom && dom instanceof HTMLElement) {
                    //检测当前dom不是组件根dom
                    if (dom !== comObj.elDom) {
                        //解析组件标签的m-for
                        let obj = this.parseComponentLabelMFor(dom, comObj);
                        if (obj.flag > 0) {
                            this.runFunction(funMFor, obj);
                            return;
                        }
                    }
                    //解析组件插槽
                    let slotObj = this.parseComponentSlot(dom, comObj, funSlot && funSlot.on);
                    if (!slotObj) {
                        //通过名称获取组件
                        let name = dom.tagName;
                        let com = this.getFindNameComponent(comObj, name);
                        //获取到组件
                        if (com) {
                            //解析组件并替换
                            let newCom = this.parseComponent(com, dom, comObj);
                            this.runFunction(funCom, newCom);
                            this.componentAddDomLoad(newCom);
                        } else {
                            //框架解析普通标签之前运行
                            this.parseOrdinaryLabelBefore(dom, comObj);
                            //解析普通html标签
                            this.parseOrdinaryLabel(dom, comObj);
                            this.runFunction(funHtml, dom);
                            //框架解析普通标签完成运行
                            this.parseOrdinaryLabelLoad(dom, comObj);
                        }
                    } else {
                        if (funSlot) {
                            if (funSlot.constructor === Function) {
                                this.runFunction(funSlot, slotObj);
                            } else {
                                this.runFunction(funSlot.fun, slotObj);
                            }
                        }
                    }
                }
            },

            /**
             * 通过组件原型生成组件
             * @param comPrototype
             */
            findPrototypeCreateComponent: function (comPrototype) {
                let com = {};
                for (const [name, value] of Object.entries(comPrototype)) {
                    if ((name === 'data' || name === '$refs' || name === '$emits' || name === '$slots' || name === 'childrenDom') && (value.constructor === Function)) {
                        com[name] = value();
                    } else {
                        com[name] = value;
                    }
                }
                return com;
            },

            /**
             *  解析组件
             * @param comPrototype
             * @param comLabel
             * @param parentCom
             */
            parseComponent: function (comPrototype, comLabel, parentCom) {
                let that = this;
                //通过组件生成新的组件
                let copyCom = this.findPrototypeCreateComponent(comPrototype);

                //elDom为假
                if (!copyCom.elDom) {
                    //解析组件之前
                    this.componentParseFront(copyCom);
                    copyCom.elDom = document.createTextNode('');
                    //组件加载完成
                    this.componentLoad(copyCom);
                    return copyCom;
                }
                //通过组件生成新的dom
                this.createNewComElDom(copyCom);

                //解析组件m-if
                let mIfFlag = this.parseComponentMIF(copyCom);

                if (mIfFlag) {

                    //添加组件父组件
                    this.addComponentParent(copyCom, parentCom);

                    //添加组件原始dom
                    this.addComponentOriginalDom(copyCom, comLabel);

                    //格式组件的props
                    this.formatComponentProps(copyCom);

                    //解析组件标签的属性
                    this.parseComponentLabelAttr(comLabel, parentCom, copyCom);

                    //组件数据this化
                    this.componentDataThisChange(copyCom);

                    //解析组件之前
                    this.componentParseFront(copyCom);

                    //组件对象重置
                    this.resetComponentObj(copyCom);

                    //解析所有的类型标签
                    this.parseAllTypeLabel(copyCom.elDom, copyCom, null, function (com) {
                        copyCom.elDom = com.elDom;
                        that.importComponentStyle(copyCom, com);
                    });

                    //引入组件样式
                    this.importComponentStyle(parentCom, copyCom);

                    //添加已渲染到组件的组件
                    this.addBloatedComponent(copyCom, parentCom);

                    //组件插槽替换
                    this.componentSlotReplace(comLabel, copyCom, parentCom);

                    //组件加载完成
                    this.componentLoad(copyCom);
                    return copyCom;
                } else {
                    let obj = {};
                    obj.elDom = document.createTextNode('');
                    return obj;
                }
            },
            /**
             * 解析组件并替换
             * @param comPrototype
             * @param comLabel
             * @param parentCom
             */
            parseComponentAndReplace: function (comPrototype, comLabel, parentCom) {
                //解析组件
                let com = this.parseComponent(comPrototype, comLabel, parentCom);
                //组件模板替换
                this.componentTemplateReplace(parentCom.elDom, com.elDom, comLabel);
            },
            /**
             * 解析普通html标签
             * @param dom
             * @param comObj
             */
            parseOrdinaryLabel: function (dom, comObj) {
                //解析组件属性
                this.parseComponentAttr(dom, comObj);
                //解析组件文本
                this.parseComponentText(dom, comObj);

                this.parseEditableLabel(dom, comObj);

                //解析组件子标签的m-if m-elif m-else
                let ifArr = this.parseComponentChildLabelMIF(dom, comObj);
                //解析组件dom的子dom
                this.parseComponentDomChild(dom, comObj, ifArr);
            },

            /**
             * 解析可编辑标签实现数据绑定
             * @param dom
             * @param comObj
             */
            parseEditableLabel: function (dom, comObj) {
                if (dom) {
                    // console.log(dom.tagName.toLocaleLowerCase());
                }
            },


            /**
             * 通过组件生成新的dom
             * @param comObj
             */
            createNewComElDom: function (comObj) {
                comObj.elDom = this.createNewDom(comObj.elDom);
            },
            /**
             * 通过dom复制一个新的dom
             * @param dom
             */
            createNewDom: function (dom) {
                if (dom) {
                    return dom.cloneNode(true);
                }
                return dom;
            },
            //添加组件父组件
            addComponentParent: function (comObj, parentCom) {
                comObj.parent = parentCom;
            },
            //添加组件原始dom
            addComponentOriginalDom: function (comObj, originalDom) {
                comObj.originalDom = originalDom;
            },

            /**
             *
             */
            /**
             * 属性加工厂
             * @param dom
             * @param type类型(是否增加属性)
             * @returns {[]}
             */
            attrProcessingPlant: function (dom, type) {
                let attrs = dom.attributes;
                let newAttrs = [];
                for (const a of attrs) {
                    let obj = {};
                    obj.name = a.name;
                    obj.value = a.value;
                    newAttrs.push(obj);
                }
                for(let a of newAttrs){
                    let name = a.name;
                    let str = ''
                    switch (name[0]) {
                        case '@':
                            str = 'm-js:';
                            break;
                        case ':':
                            str = 'm-attr:';
                            break;
                    }
                    if(str){
                        dom.removeAttribute(name);
                        a.name = str + name.substring(1);
                        if(type === 1){
                            dom.setAttribute(a.name, a.value);
                        }
                    }
                }
                return newAttrs;
            },

            /**
             * 解析组件属性
             * @param dom 组件elDom
             * @param comObj 组件对象
             */
            parseComponentAttr: function (dom, comObj) {
                //属性加工厂
                let newAttrs = this.attrProcessingPlant(dom, 0);
                //解析每一个属性
                for (let a of newAttrs) {
                    //解析普通属性
                    if(this.parseOrdinaryAttr(a, dom, comObj)){
                        dom.setAttribute(a.name, a.value);
                    }else {
                        //解析ref
                        this.parseComponentRef(a, dom, comObj);

                        //解析m-attr
                        this.parseComponentMAttr(a, dom, comObj);

                        //解析组件m-js
                        this.parseComponentMJs(a, dom, comObj);

                        //解析组件m-text
                        this.parseComponentMText(a, dom, comObj);
                    }
                }
            },

            /**
             * 解析组件文本
             * @param dom
             * @param comObj
             */
            parseComponentText: function (dom, comObj) {
                let child = dom.childNodes;
                for (let c of child) {
                    if (c.nodeName === '#text') {
                        let reg = /\{\{([^\}]*)\}\}/g;
                        let execs = [];
                        let exec = null;
                        while (exec = reg.exec(c.textContent)) {
                            execs.push(exec);
                        }
                        for (let e of execs) {
                            if (e && e[1]) {
                                //解析框架字符串{{}}
                                let runValue = this.parseFrameString(comObj, e[1]);
                                let text = c.textContent;
                                let that = this;
                                this.depNamesDispose(function (object, key, parameterObj) {
                                    new Main.Subscriber(object, key, function () {
                                        c.textContent = text.replace(e[0], that.parseFrameString(parameterObj, e[1]));
                                    })
                                }, comObj.parseAddObjData);
                                c.textContent = text.replace(e[0], runValue);
                            }
                        }
                    }
                }
            },
            /**
             * 解析组件标签的属性
             * @param labelDom 标签dom元素
             * @param comObj   组件对象
             * @param childComObj 子组件对象
             */
            parseComponentLabelAttr: function (labelDom, comObj, childComObj) {
                if(labelDom) {
                    //属性加工
                    let attrs = this.attrProcessingPlant(labelDom, 1);
                    for (let a of attrs) {
                        //解析组件标签ref
                        this.parseComponentLabelRef(a, childComObj, comObj);

                        //解析组件标签常规属性
                        this.parseComponentLabelRoutine(a, childComObj);

                        //解析组件标签m-attr
                        this.parseComponentLabelMAttr(a, comObj, childComObj);

                        //解析组件标签m-js
                        this.parseComponentLabelMJs(a, comObj, childComObj);
                    }
                }
            },


            /**
             * 解析组件m-if
             * @param comObj
             */
            parseComponentMIF: function (comObj) {
                if(!(comObj.elDom instanceof HTMLElement)) {
                    return true;
                }
                let mIFFlag = this.parseMIFDispose(comObj.elDom, comObj, 'm-if');
                if (!mIFFlag && comObj.elDom.hasAttribute('m-if')) {
                    if (comObj.elDom.parentNode) {
                        comObj.elDom.parentNode.removeChild(comObj.elDom);
                    }
                    return false;
                }
                return true;
            },

            /**
             * 解析m-if
             * @param dom
             * @param comObj
             * @param ifAttr
             * @returns {Boolean}
             */
            parseMIFDispose: function (dom, comObj, ifAttr) {
                let mIFValue = dom.getAttribute(ifAttr);
                if (mIFValue) {
                    let runValue = this.parseFrameString(comObj, mIFValue);
                    if (runValue) {
                        return true;
                    }
                }
                return false;
            },

            /**
             *  解析主键m-if显示元素(普通)
             * @param mifArr
             */
            parseMIFDomShow: function (v) {
                if (v) {
                    if (v.show && v.mifObj.showObj === v) {
                        for (let e of v.elDomFun) {
                            e.false();
                        }
                        for (let s of v.elDom) {
                            this.removeLabelElement(s);
                        }
                        let after = v.replace;
                        for (let e of v.elDomFun) {
                            e.true();
                        }
                        for (let e of v.elDom) {
                            this.insertAfter(e, after);
                            after = e;
                        }
                    }
                }
            },

            /**
             *  解析主键m-if显示元素
             * @param mifObj
             */

            parseMIFDomClassify: function (mifObj) {
                let d = mifObj.val;
                let obj = null;
                if (mifObj.showObj) {
                    if (mifObj.showObj.noElDomFun) {
                        this.runFunction(mifObj.showObj.noElDomFun.false);
                    }
                    for (let e of mifObj.showObj.elDomFun) {
                        e.false();
                    }
                    for (let s of mifObj.showObj.elDom) {
                        this.removeLabelElement(s);
                    }
                    mifObj.showObj = null;
                }
                for (let i = 0; i < d.length; i++) {
                    let v = d[i];
                    if ((v.show || v.name === 'm-else') && (!obj)) {
                        let after = v.replace;
                        if (v.noElDomFun) {
                            this.runFunction(v.noElDomFun.true);
                        }
                        for (let e of v.elDomFun) {
                            e.true();
                        }
                        for (let e of v.elDom) {
                            this.insertAfter(e, after);
                            after = e;
                        }
                        mifObj.showObj = v;
                        obj = [v];
                        if (!v.firstTime) {
                            v.firstTime = true;
                        }
                    } else {
                        if (!v.firstTime) {
                            v.firstTime = true;
                            for (let e of v.elDomFun) {
                                e.false();

                            }
                        }
                    }
                }
                return obj;
            },

            /**
             * 更新m-if显示视图
             * @param domArr
             * @param comObj
             */
            updateMIFDom: function (domArr, comObj) {
                let arr = [];
                for (let d of domArr) {
                    for (let v of d.val) {
                        if (v.name !== 'm-else') {
                            let that = this;
                            let runObj = this.parseFrameString(comObj, v.attr);
                            this.depNamesDispose(function (object, key, parameterObj) {
                                new Main.Subscriber(object, key, function () {
                                    let val = that.parseFrameString(parameterObj, v.attr);
                                    if (val) {
                                        v.show = true;
                                    } else {
                                        v.show = false;
                                    }
                                    if (!(v.show && d.showObj === v)) {
                                        that.parseMIFDomClassify(d);
                                    }
                                })
                            }, comObj.parseAddObjData);
                            if (runObj) {
                                v.show = true;
                            }
                        }
                    }
                    let ar = this.parseMIFDomClassify(d);
                    if (ar) {
                        for (let a of ar) {
                            arr.push(a);
                        }
                    }
                }
                return arr;
            },

            /**
             * 解析
             * @param domArr
             * @param comObj
             */
            parseMIFGroupingObj: function (domArr, comObj) {
                for (let d of domArr) {
                    for (let v of d.val) {
                        v.mifObj = d;
                        this.parseAllTypeLabel(v.el, comObj,
                            function (slotObj) {
                                v.parseType = 0;
                                v.slot = [slotObj];
                                v.elDom.push(v.el);
                                if (!comObj.$ifSlots) {
                                    comObj.$ifSlots = [];
                                }
                                comObj.$ifSlots.push(v);
                            }, function (com) {
                                v.parseType = 1;
                                v.elDom.push(com.elDom);
                                this.replaceLabelElement(com.elDom, v.el);
                            }, function (dom) {
                                v.parseType = 2;
                                v.elDom.push(dom);
                            }, function (forObj) {
                                forObj.mifObj = true;
                                v.parseType = 3;
                                if (forObj.parseType === 0) {
                                    v.slot = forObj.doms;
                                    for (let s of forObj.doms) {
                                        v.elDom.push(s.dom);
                                    }
                                    if (!comObj.$ifSlots) {
                                        comObj.$ifSlots = [];
                                    }
                                    comObj.$ifSlots.push(v);
                                } else {
                                    v.elDom = forObj.doms;
                                }
                            })
                    }
                }
            },

            /**
             * 解析m-if分组
             * @param doms
             * @returns {[]}
             */
            parseMIFGrouping: function (doms) {
                let flag = false;
                let domArr = [];
                let ifs = [];
                for (const c of doms) {
                    if (flag) {
                        let mELIF = c.hasAttribute('m-elif');
                        if (mELIF) {
                            ifs.push({
                                name: 'm-elif',
                                el: c,
                                attr: c.getAttribute('m-elif'),
                                show: false
                            });
                            c.removeAttribute('m-elif');
                            if (c === doms[doms.length - 1]) {
                                domArr.push(ifs);
                            }
                            continue;
                        } else {
                            flag = false;
                            let mELSE = c.hasAttribute('m-else');
                            domArr.push(ifs);
                            if (mELSE) {
                                ifs.push({name: 'm-else', el: c, show: false});
                                c.removeAttribute('m-else');
                                ifs = [];
                                continue;
                            }
                            ifs = [];
                        }
                    }
                    let mIF = c.hasAttribute('m-if');
                    if (mIF) {
                        ifs.push({name: 'm-if', el: c, attr: c.getAttribute('m-if'), show: false});
                        c.removeAttribute('m-if');
                        flag = true;
                        if (c === doms[doms.length - 1]) {
                            domArr.push(ifs);
                        }
                    }
                }
                return domArr;
            },

            /**
             * 重组m-if分组对象
             * @param domArr
             */
            regroupMIFGroupingObjBefore: function (domArr) {
                let arr = [];
                for (let a of domArr) {
                    let obj = {};
                    if (a.length > 0) {
                        for (const c of a) {
                            c.elDom = [];
                            c.elDomFun = [];
                        }
                        obj.val = a;
                        arr.push(obj);
                    }
                }
                return arr;
            },

            /**
             * 重组m-if分组对象
             * @param domArr
             * @returns {[]}
             */
            regroupMIFGroupingObjAfter: function (domArr) {
                for (let a of domArr) {
                    for (let v of a.val) {
                        if (v.elDomFun.length > 0) {
                            for (let e of v.elDomFun) {
                                e.delete();
                            }
                        }
                        if (v.elDom.length > 0) {
                            v.replace = document.createTextNode('');
                            this.insertBefore(v.replace, v.elDom[0]);
                            for (let e of v.elDom) {
                                this.removeLabelElement(e);
                            }
                        }
                    }
                }
            },


            /**
             * 解析组件子标签的m-if m-elif m-else
             * @param dom
             * @param comObj
             */
            parseComponentChildLabelMIF: function (dom, comObj) {
                let child;
                if (dom.constructor === Array) {
                    child = dom;
                } else {
                    child = dom.children;
                }
                //解析m-if分组
                let domArr = this.parseMIFGrouping(child);
                let arr = this.regroupMIFGroupingObjBefore(domArr);
                this.parseMIFGroupingObj(arr, comObj);
                this.regroupMIFGroupingObjAfter(arr);
                //更新m-if显示视图
                let ar = this.updateMIFDom(arr, comObj);
                return ar;
            },


            /**
             * for运行函数
             * @param copyDom 需要复制的dom元素
             * @param replaceDom dom添加位置的dom
             * @param forRecordObj  循环记录对象
             * @param comObj  组件对象
             * @param addObjData for循环添加数据
             * @returns {*}
             */
            runMFORCode: function (copyDom, replaceDom, forRecordObj, comObj, addObjData) {
                let newDom = this.createNewDom(copyDom);
                this.insertAfter(newDom, replaceDom);
                forRecordObj.num++;
                this.parseComponentAndAddObjData(newDom, comObj, addObjData,
                    function (slotObj) {
                        forRecordObj.parseType = 0;
                        forRecordObj.doms.push(slotObj);
                    }, function (com) {
                        this.replaceLabelElement(com.elDom, newDom);
                        forRecordObj.parseType = 1;
                        newDom = com.elDom;
                        forRecordObj.doms.push(com.elDom);
                    }, function (dom) {
                        forRecordObj.parseType = 2;
                        forRecordObj.doms.push(dom);
                    });
                return newDom;
            },
            /**
             * 解析dom并添加额外数据
             * @param dom
             * @param comObj
             * @param addObjData
             */
            parseComponentAndAddObjData: function (dom, comObj, addObjData, funSlot, funCom, funHtml, funMFor) {
                let obj = {};
                let objG = [];
                if (addObjData) {
                    if (comObj.parseAddObjData) {
                        for (const [name, value] of Object.entries(addObjData)) {
                            let v = comObj.parseAddObjData[name];
                            if (v) {
                                obj[name] = v;
                            }
                            comObj.parseAddObjData[name] = value;
                            this.resetComponentKeys(comObj, 'parseAddObjData', name)
                        }
                    } else {
                        comObj.parseAddObjData = addObjData;
                        for (const [name] of Object.entries(addObjData)) {
                            Main.Dep.names = [];
                            let v = comObj[name];
                            if (v != undefined) {
                                let names = this.getDepNames();
                                if (names.length == 2) {
                                    objG.push({type: 0, obj: names});
                                } else {
                                    objG.push({type: 1, obj: [name, v]});
                                }
                            }
                            this.resetComponentKeys(comObj, 'parseAddObjData', name)
                        }
                    }
                }
                //解析所有的类型标签
                this.parseAllTypeLabel(dom, comObj, funSlot, funCom, funHtml, funMFor);
                if (addObjData) {
                    if (comObj.parseAddObjData === addObjData) {
                        for (const [name] of Object.entries(addObjData)) {
                            delete comObj[name];
                        }
                        for (const v of objG) {
                            let o = v.obj;
                            if (v.type === 0) {
                                this.resetComponentKeys(comObj, o[0], o[1])
                            } else if (v.type === 1) {
                                comObj[o[0]] = o[1];
                            }
                        }
                        delete comObj.parseAddObjData;
                    } else {
                        for (const [name] of Object.entries(addObjData)) {
                            delete comObj[name];
                            delete comObj.parseAddObjData[name]
                        }
                        for (const [name, value] of Object.entries(obj)) {
                            comObj.parseAddObjData[name] = value;
                            this.resetComponentKeys(comObj, 'parseAddObjData', name)
                        }
                    }
                }
            },
            /**
             * m-for参数赋值
             * @param parameters
             * @param value
             * @param index
             * @param name
             */
            runMFORAssignment: function (parameters, value, index, name) {
                let obj = {};
                if (parameters[0]) {
                    obj[parameters[0]] = value;
                }
                if (parameters[1]) {
                    obj[parameters[1]] = index;
                }
                if (parameters[2]) {
                    obj[parameters[2]] = name;
                }
                return obj;
            },

            /**
             *
             * @param runValue
             * @param dom
             * @param parameters
             * @param obj
             * @param comObj
             */
            parseDomMFORValue: function (runValue, newDom, dom, parameters, obj, comObj) {
                if (runValue.constructor === Number) {
                    for (let j = 0; j < runValue; j++) {
                        let obj1 = this.runMFORAssignment(parameters, j + 1, j, j);
                        newDom = this.runMFORCode(dom, newDom, obj, comObj, obj1);
                    }
                } else if (runValue.constructor === String || runValue.constructor === Object || runValue.constructor === Array) {
                    let that = this;
                    Object.keys(runValue).forEach(function (key, index) {
                        let obj1 = that.runMFORAssignment(parameters, runValue[key], index, key);
                        newDom = that.runMFORCode(dom, newDom, obj, comObj, obj1);
                    });
                } else if (runValue.constructor === Map) {
                    let keys = runValue.keys();
                    let j = 0;
                    for (const k of keys) {
                        let obj1 = this.runMFORAssignment(parameters, runValue.get(k), j++, k);
                        newDom = this.runMFORCode(dom, newDom, obj, comObj, obj1);
                    }
                } else {
                    console.error('for暂时不支持：' + runValue.constructor + '类型');
                }
            },

            /**
             * 解析单个dom的m-for
             * @param dom
             * @param comObj
             */
            parseDomMFOR: function (dom, comObj) {
                let obj = {num: 0, parseType: null, doms: [], flag: false};
                let that = this;
                let mForValue = dom.getAttribute('m-for');
                if (mForValue) {
                    obj.flag = true;
                    //删除属性
                    dom.removeAttribute('m-for');
                    let replaceDom = document.createTextNode('');
                    this.insertAfter(replaceDom, dom);
                    //解析m-for结构
                    let splits = mForValue.split(/\sof\s|\sin\s/);
                    if (splits.length === 2) {
                        let runValue = this.parseFrameString(comObj, splits[1]);
                        let parameter = splits[0].trim();
                        let parameters = [];
                        if (parameter.match(',')) {
                            if (!(parameter.charAt(0) === '(' && parameter.charAt(parameter.length - 1) === ')')) {
                                console.error('for格式错误');
                                return;
                            }
                            parameter = parameter.substring(1, parameter.length - 1);
                            parameters = parameter.split(',');
                        } else {
                            parameters.push(parameter);
                        }
                        //去名称空格
                        for (let i = 0; i < parameters.length; i++) {
                            parameters[i] = parameters[i].trim();
                        }
                        this.depNamesDispose(function (object, key, parameterObj) {
                            new Main.Subscriber(object, key, function () {
                                for (const d of obj.doms) {
                                    that.removeLabelElement(d);
                                }
                                obj.num = 0;
                                obj.doms.length = 0;
                                runValue = that.parseFrameString(parameterObj, splits[1]);
                                that.parseDomMFORValue(runValue, replaceDom, dom, parameters, obj, comObj);
                            })
                        }, comObj.parseAddObjData);
                        if (runValue) {
                            this.parseDomMFORValue(runValue, replaceDom, dom, parameters, obj, comObj);
                        }
                    } else {
                        console.error('for格式错误：' + dom.tagName);
                    }
                    //删除当前节点
                    if (dom.parentNode) {
                        dom.parentNode.removeChild(dom);
                    }
                }
                return obj;
            },


            /**
             * 解析组件标签的m-for
             * @param dom
             * @param comObj
             */
            parseComponentLabelMFor: function (dom, comObj) {
                return this.parseDomMFOR(dom, comObj);
            },

            /**
             * js 在元素后面添加新元素
             * @param newElement
             * @param targentElement
             */
            insertAfter: function (newElement, targentElement) {
                let parent = targentElement.parentNode;
                if(parent) {
                    if (parent.lastChild == targentElement) {
                        parent.appendChild(newElement);
                    } else {
                        parent.insertBefore(newElement, targentElement.nextSibling);
                    }
                }
            },

            /**
             * js 在元素前面添加新元素
             * @param newElement
             * @param targentElement
             */
            insertBefore: function (newElement, targentElement) {
                let parent = targentElement.parentNode;
                if (parent) {
                    parent.insertBefore(newElement, targentElement);
                }
            },

            /**
             * 删除标签
             * @param element
             */
            removeLabelElement: function (element) {
                let parent = element.parentNode;
                if (parent) {
                    parent.removeChild(element);
                }
            },

            /**
             * 替换标签
             * @param newNode
             * @param oldNode
             */
            replaceLabelElement: function (newNode, oldNode) {
                let parent = oldNode.parentNode;
                if (parent) {
                    parent.replaceChild(newNode, oldNode)
                }
            },
            /**
             * 解析组件插槽
             * @param dom  被节点标签
             * @param comObj 组件对象
             */
            parseComponentSlot: function (dom, comObj, flag) {
                let labelName = dom.tagName.toLowerCase();
                if (labelName === 'slot') {
                    if (flag) {
                        return true;
                    }
                    let slotObj = {};
                    let attrs = dom.attributes;
                    //插槽属性解析
                    for (let a of attrs) {
                        //插槽m-attr解析
                        this.parseComponentSlotMAttr(a, slotObj, comObj);
                    }
                    //解析插槽名称
                    let name = dom.getAttribute('name');
                    //默认插槽名称
                    name = name ? name : 'default';
                    //写入插槽名称
                    slotObj.name = name;
                    //写入插槽dom
                    slotObj.dom = dom;

                    let names = comObj.$slots[name];
                    if (names) {
                        names.push(slotObj);
                    } else {
                        let arr = new Array();
                        arr.push(slotObj);
                        comObj.$slots[name] = arr;
                    }
                    return slotObj;
                }
                return null;
            },
            /**
             * 解析组件插槽的m-attr
             * @param attr
             * @param slotObj
             * @param comObj
             */
            parseComponentSlotMAttr: function (attr, slotObj, comObj) {
                this.parseAttrMAttr(attr, function (obj) {
                    //得到m-attr解析值
                    this.parseFrameString(comObj, obj.value);
                    let names = this.getDepNames();
                    let incidentName = obj.incidentName;
                    slotObj[incidentName] = {};
                    if (names.length > 0) {
                        Object.defineProperty(slotObj[incidentName], incidentName, {
                            enumerable: true,
                            configurable: true,
                            get: function proxyGetter() {
                                return names[names.length - 2][names[names.length - 1]];
                            }
                        });
                    }
                }, this);
            },

            /**
             * 获取DepNames
             */
            getDepNames: function () {
                let names = Main.Dep.names;
                Main.Dep.names = null;
                return names;
            },

            /**
             * names处理函数
             * @param fun
             * @param addObjData
             */
            depNamesDispose: function (fun, ...addObjData) {
                let names = this.getDepNames();
                let arr = [];
                let arr1 = [];
                if (names.length > 1) {
                    // console.log(names)
                    if (names.length > 2) {
                        for (let i = names.length - 2; i > 1; i -= 2) {
                            if (names[i] === names[i - 2][names[i - 1]]) {
                                arr.push(i - 1);
                                arr.push(i - 2);
                            } else {
                                arr1.push(names[i]);
                                arr1.push(names[i + 1]);
                            }
                        }
                    }
                    arr1.push(names[0], names[1]);
                    if (addObjData) {
                        for (const a of addObjData) {
                            if (a) {
                                Object.keys(a).forEach(function (key) {
                                    arr1.push(a);
                                    arr1.push(key);
                                })
                            }
                        }
                    }
                    let parameterObj = {};
                    for (let i = 0; i < arr1.length; i += 2) {
                        Object.defineProperty(parameterObj, arr1[i + 1], {
                            enumerable: true,
                            configurable: true,
                            get: function proxyGetter() {
                                return arr1[i][arr1[i + 1]];
                            }
                        });
                    }
                    for (const a of arr) {
                        names.splice(a, 1);
                    }
                    for (let i = 0; i < names.length; i += 2) {
                        fun(names[i], names[i + 1], parameterObj, names.length);
                    }
                }
            },

            /**
             * 判断if对象是否有slot
             * @param ifSlots
             * @param slot
             * @returns {string|null}
             */
            ifSlotsFind: function (ifSlots, slot) {
                if (ifSlots) {
                    for (let i of ifSlots) {
                        for (let t of i.slot) {
                            if (t === slot) {
                                return i;
                            }
                        }
                    }
                }
                return null;
            },

            /**
             * 判断if对象是否存在dom
             * @param domArr
             * @param dom
             * @returns {any|null}
             */
            ifLabelFind: function (domArr, dom) {
                if (domArr) {
                    for (let i of domArr) {
                        for (let t of i.val) {
                            if (t.el === dom) {
                                return t;
                            }
                        }
                    }
                }
                return null;
            },

            /**
             * 组件插槽替换
             * @param dom  组件标签dom
             * @param comObj  组件对象
             * @param parentCom 组件标签所在的组件
             */
            componentSlotReplace: function (dom, comObj, parentCom) {
                if(!dom){
                    return;
                }
                //查找标签的m-slot
                let arrObj = this.searchLabelMSlot(dom);
                let saveArr = {};
                for (const [name, val] of Object.entries(arrObj)) {
                    saveArr[name] = {
                        num: 0
                    }
                }
                let child = dom.children;
                //解析m-if分组
                let domArr = this.parseMIFGrouping(child);
                domArr = this.regroupMIFGroupingObjBefore(domArr);

                //清空if传递的elDom
                let ifSlots = comObj.$ifSlots;
                if (ifSlots) {
                    for (let i of ifSlots) {
                        i.elDom = [];
                    }
                }
                //替换插槽
                for (const [name, slot] of Object.entries(comObj.$slots)) {
                    //通过名称获取插槽对象
                    let obj = arrObj[name];
                    let that = this;
                    //有对应的插槽内容
                    if (obj && slot.length > 0) {
                        //替换插槽
                        for (const s of slot) {
                            //检测当前元素的插槽是否有判断标签
                            let elArr = this.ifSlotsFind(ifSlots, s);
                            let doms = [];
                            for (const d of obj.dom) {
                                doms.push(this.createNewDom(d))
                            }
                            //解析标签
                            for (let i = 0; i < doms.length; i++) {
                                let d = doms[i];
                                let slotDomArr = [];
                                // debugger
                                //解析dom并添加额外数据
                                this.parseComponentAndAddObjData(d, parentCom, s[obj.value],
                                    {
                                        on: true
                                    }, function (com) {
                                        slotDomArr.push(com.elDom);
                                    }, function (d) {
                                        slotDomArr.push(d);
                                    }, function (obj) {
                                        slotDomArr = obj.doms;
                                    });
                                for (const c of slotDomArr) {
                                    //检测当前dom元素是否有判断标签
                                    let t = this.ifLabelFind(domArr, obj.dom[i])
                                    let d = c;
                                    //插槽有判断标签
                                    if (elArr) {
                                        let index = elArr.elDom.length;
                                        elArr.elDom.push(d);
                                        if (t) {
                                            this.readMIfElDomFun(t, index, d, elArr.elDom,
                                                function () {
                                                    //上一是如果使用默认了默认插槽的值，这里就要先删除默认插槽的dom元素
                                                    if (saveArr[name].num <= 0 && s.parseFlag) {
                                                        that.addDefaultSlotLabel(s, false);
                                                    }
                                                    //增加替换插槽的数量
                                                    saveArr[name].num++;
                                                    //删除if默认插槽使用对象
                                                    if (elArr.noElDomFun) {
                                                        elArr.noElDomFun = null;
                                                    }
                                                }, function () {
                                                    //插槽替换dom减一，如果为0，替换为默认插槽的值
                                                    if (--saveArr[name].num <= 0) {
                                                        //检测插槽默认值是否解析了，没有则解析
                                                        if (!s.parseFlag) {
                                                            that.parseDefaultSlotLabel(s, comObj);
                                                            s.dom = elArr.replace;
                                                        }
                                                        //判断当前插槽是否显示如果显示就显示默认插槽的元素
                                                        if (elArr === elArr.mifObj.showObj) {
                                                            that.addDefaultSlotLabel(s, true);
                                                        }
                                                        //插槽没有替换元素是使用增加默认插槽的添加和删除
                                                        elArr.noElDomFun = {
                                                            true: function () {
                                                                that.addDefaultSlotLabel(s, true);
                                                            },
                                                            false: function () {
                                                                that.addDefaultSlotLabel(s, false);
                                                            }
                                                        }
                                                    }
                                                });
                                        }
                                    } else {
                                        //插槽没有判断标签
                                        that.insertBefore(d, s.dom);
                                        //替换元素有判断标签
                                        if (t) {
                                            let replace = document.createTextNode('');
                                            this.insertBefore(replace, d);
                                            //增加判断运行步骤
                                            t.elDomFun.push({
                                                true: function () {
                                                    that.insertAfter(d, replace);
                                                    if (saveArr[name].num <= 0 && s.parseFlag) {
                                                        that.addDefaultSlotLabel(s, false);
                                                    }
                                                    saveArr[name].num++;
                                                },
                                                delete: function () {
                                                    that.removeLabelElement(d);
                                                },
                                                false: function () {
                                                    this.delete();
                                                    if (--saveArr[name].num <= 0) {
                                                        if (!s.parseFlag) {
                                                            that.parseDefaultSlotLabel(s, comObj);
                                                            s.dom = replace;
                                                        }
                                                        that.addDefaultSlotLabel(s, true);
                                                    }
                                                }
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        //使用插槽默认值
                        for (const s of slot) {
                            //解析插槽默认值
                            this.parseDefaultSlotLabel(s, comObj);
                            this.addDefaultSlotLabel(s, true);
                        }
                    }
                    //删除所有的插槽标签
                    for (const s of slot) {
                        this.deleteDomThis(s.dom);
                    }
                }
                //更新m-if显示视图
                this.regroupMIFGroupingObjAfter(domArr);
                this.updateMIFDom(domArr, parentCom);
                //重新判断
                if (ifSlots) {
                    for (let i of ifSlots) {
                        this.parseMIFDomShow(i);
                    }
                }
            },

            /**
             * 显示或隐藏插槽默认元素
             * @param slot
             * @param flag
             */
            addDefaultSlotLabel: function (slot, flag) {
                if (flag) {
                    let dom = slot.dom;
                    for (const c of slot.parseElDom) {
                        this.insertBefore(c, dom);
                    }
                } else {
                    for (const c of slot.parseElDom) {
                        this.removeLabelElement(c);
                    }
                }
            },

            /**
             * 解析插槽默认元素
             * @param dom
             * @param replace
             */
            parseDefaultSlotLabel: function (slot, comObj) {
                let childs = slot.dom.children;
                slot.parseElDom = [];
                slot.parseFlag = true;
                //解析m-if分组
                let domArr = this.parseMIFGrouping(childs);
                domArr = this.regroupMIFGroupingObjBefore(domArr);
                for (let i = 0; i < childs.length; i++) {
                    let child = childs[i];
                    let parseArr = [];
                    let t = this.ifLabelFind(domArr, child);
                    this.parseAllTypeLabel(child, comObj, {on: true},
                        function (com) {
                            //组件模板替换
                            parseArr.push(com.elDom);
                        }, function (dom) {
                            parseArr.push(dom);
                        }, function (forObj) {
                            parseArr = forObj.doms;
                            i += forObj.num == 0 ? 0 : forObj.num - 1;
                        });
                    for (const d of parseArr) {
                        if (t) {
                            let index = slot.parseElDom.length;
                            slot.parseElDom.push(d);
                            this.readMIfElDomFun(t, index, d, slot.parseElDom);
                        } else {
                            slot.parseElDom.push(d);
                        }
                    }
                }
                //更新m-if显示视图
                this.regroupMIFGroupingObjAfter(domArr);
                this.updateMIFDom(domArr, comObj);
            },

            /**
             *
             * @param t
             * @param index
             * @param d
             */
            readMIfElDomFun: function (t, index, d, arr, trueFun, falseFun) {
                let that = this;
                let replace = document.createTextNode('');
                t.elDomFun.push({
                    true: function () {
                        arr[index] = d;
                        that.replaceLabelElement(d, replace);
                        that.runFunction(trueFun);
                    },
                    delete: function () {
                        arr[index] = replace;
                        that.replaceLabelElement(replace, d);
                    },
                    false: function () {
                        this.delete();
                        that.runFunction(falseFun);
                    }
                });
            },

            /**
             * 删除元素本身
             * @param dom
             */
            deleteDomThis: function (dom) {
                if (dom.parentNode) {
                    dom.parentNode.removeChild(dom);
                }
            },
            /**
             * 查找标签的m-slot
             * @param dom
             * @returns {{}}
             */
            searchLabelMSlot: function (dom) {
                let arrObj = {};
                let flag = true;
                let children = dom.children;
                for (const v of children) {
                    let attrs = v.attributes;
                    for (const a of attrs) {
                        let obj = this.searchAttrM(a, /m-slot/);
                        if (obj.flag) {
                            //删除m-slot属性
                            v.removeAttribute(a.name);
                            obj.dom = [v];
                            arrObj[obj.incidentName] = obj;
                            flag = false;
                            break;
                        }
                    }
                    if (flag) {
                        if (!arrObj.default) {
                            arrObj.default = {};
                            arrObj.default.dom = [];
                        }
                        arrObj.default.dom.push(v);
                    }
                    flag = true;
                }
                return arrObj;
            },
            /**
             * 组件模板替换
             * @param containerDom
             * @param comDom
             * @param replaceDom
             */
            componentTemplateReplace: function (containerDom, comDom, replaceDom) {
                containerDom.replaceChild(comDom, replaceDom);
            },

            /**
             * 数据劫持
             * @param obj
             * @param name
             * @param value
             */
            dataHijack: function (obj, name, value) {
                this.observe(value);
                let dep = new Main.Dep();
                let that = this;
                Object.defineProperty(obj, name, {
                    configurable: true,
                    get: function () {
                        that.depIndirectDispose(dep, obj, name);
                        return value;
                    },
                    set: function (v) {
                        // console.log('值发生改变' + value + "----->" + v);
                        value = v;
                        dep.runAll();
                    }
                })
            },
            /**
             * 数据监听
             * @param obj
             */
            observe: function (obj) {
                if (!obj || (obj.constructor !== Object && obj.constructor !== Array)) {
                    return;
                }
                let that = this;
                Object.keys(obj).forEach(function (key) {
                    that.dataHijack(obj, key, obj[key]);
                })
            },

            /**
             * 处理组件的计算属性
             * @param comObj
             */
            resetComponentComputes: function (comObj) {
                let computes = comObj.computes;
                comObj.computes = {};
                let that = this;
                Object.keys(computes).forEach(function (key) {
                    that.computesDataHijack(comObj.computes, key, computes[key], comObj);
                })
            },

            /**
             * dep间接处理
             * @param dep
             */
            depIndirectDispose: function (dep, obj, name) {
                if (Main.Dep.objValue === obj && dep) {
                    dep.addSub(Main.Dep.value);
                }
                if (Main.Dep.names) {
                    Main.Dep.names.push(obj)
                    Main.Dep.names.push(name)
                }
            },

            /**
             * 计算属性数据劫持
             * @param obj
             * @param name
             * @param value
             * @param comObj
             */
            computesDataHijack: function (obj, name, value, comObj) {
                let constructor = value.constructor;
                let dep = new Main.Dep();
                let that = this;
                if (constructor === Function) {
                    Object.defineProperty(obj, name, {
                        enumerable: true,
                        configurable: true,
                        get: function () {
                            that.depIndirectDispose(dep, obj, name);
                            return value.call(comObj);
                        }
                    });
                } else if (constructor === Object) {
                    let obj1 = {
                        enumerable: true,
                        configurable: true
                    };
                    if (value.get) {
                        obj1.get = function () {
                            let get = value.get;
                            that.depIndirectDispose(dep, obj, name);
                            if (get && get.constructor === Function) {
                                return value.get.call(comObj);
                            } else if (value.constructor === Function) {
                                return value.call(comObj);
                            }
                            return value;
                        }
                    }
                    if (value.set) {
                        if (value.set.constructor === Function) {
                            let set = value.set;
                            obj1.set = function (newVal) {
                                value = set.call(comObj, newVal);
                                dep.runAll();
                            }
                        }
                    }
                    Object.defineProperty(obj, name, obj1);
                }
            },

            /**
             * 重置组件数据对象key
             * @param storageObj
             * @param name
             * @param key
             */
            resetComponentKeys: function (storageObj, name, key) {
                Object.defineProperty(storageObj, key, {
                    enumerable: true,
                    configurable: true,
                    get: function proxyGetter() {
                        if (name.constructor === Object) {
                            return name[key];
                        } else {
                            return storageObj[name][key];
                        }
                    },
                    set: function proxySetter(newVal) {
                        if (name.constructor === Object) {
                            name[key] = newVal;
                        } else {
                            storageObj[name][key] = newVal;
                        }
                    }
                });
            },

            /**
             * 重写数组原型函数
             * @param arr
             */
            rewriteArrayPrototypeFun: function (arr, obj, name) {
                if (arr && arr.constructor === Array) {
                    let that = this;
                    //所有的数组共用一个原型对象所以这里重写创建一个数组原型对象
                    let proto = Object.create(Array.prototype);
                    proto.push = function (...items) {
                        for (const v of items) {
                            this[this.length] = v;
                        }
                        obj[name] = this;
                    }
                    proto.unshift = function (...items) {
                        let len = items.length;
                        let thisLen = this.length;
                        let arr = []
                        for (let i = 0; i < thisLen; i++) {
                            arr[i] = this[i];
                        }
                        for (let i = 0; i < len; i++) {
                            this[i] = items[i];
                        }
                        for (let i = 0; i < thisLen; i++) {
                            this[i + len] = arr[i];
                        }
                        obj[name] = this;
                    }
                    proto.pop = function () {
                        if (this.length > 0) {
                            this.length -= 1;
                        }
                        obj[name] = this;
                    }
                    proto.shift = function () {
                        if (this.length > 0) {
                            let thisLen = this.length;
                            for (let i = 0; i < thisLen - 1; i++) {
                                this[i] = this[i + 1];
                            }
                            this.length -= 1;
                        }
                        obj[name] = this;
                    }
                    proto.splice = function (start, deleteCount) {
                        if (this.length > 0 && start > -1 && deleteCount > 0) {
                            let thisLen = this.length;
                            for (let i = start; i < thisLen - deleteCount; i++) {
                                this[i] = this[i + deleteCount];
                            }
                            this.length -= deleteCount;
                        }
                        obj[name] = this;
                    }
                    arr.__proto__ = proto;
                }
            },

            //检测选择返回dom
            verifyElReturnDom: function (el) {
                //检测选择器是否为空为空返回
                if (!el) {
                    console.error('选择器不能为空');
                    return null;
                }
                //检测选择器是否是字符串类型，不是则返回
                if (el.constructor !== String) {
                    console.error('选择器只能是字符串类型');
                    return null;
                }
                //容器名称
                let elName = el.substring(1);

                //判断el是id还是class
                let at = el.charAt(0);

                if (at === '#') {
                    //id
                    //获取html选择器对象
                    return document.getElementById(elName);
                } else if (at === '.') {
                    //class
                    let arr = document.getElementsByClassName(elName);
                    if (arr.length > 1) {
                        return arr[0];
                    }
                } else {
                    console.error('选择器既不是id，也不class');
                    return null;
                }
            },
            //通过名称获取组件
            getFindNameComponent: function (newCom, name) {
                let originalName = name.toLocaleLowerCase();
                //解析驼峰命名
                name = this.parseHumpName(originalName)

                let com = this.getFindNamePartComponent(newCom, name, originalName);
                if (!com) {
                    com = this.getFindNameGlobalComponent(name, originalName);
                }
                return com;
            },

            /**
             * 组件名称匹配
             * @param n1
             * @param n2
             * @param originalName
             * @returns {boolean}
             */
            componentNameMatch: function (n1, n2, originalName) {
                n2 = n2.charAt(0).toLocaleLowerCase() + n2.substring(1);
                if(n1 === n2){
                    return true;
                }
                if(n2 === originalName){
                    return true;
                }
                return false;
            },

            //通过名称获取局部组件
            getFindNamePartComponent: function (newCom, name, originalName) {
                for(let [n, value] of Object.entries(newCom.children)){
                    if(this.componentNameMatch(name, n, originalName)){
                        //通过名称查找局部组件
                        return value;
                    }
                }
            },

            //通过名称获取全局组件
            getFindNameGlobalComponent: function (name, originalName) {
                for(let [n, value] of Object.entries(Main.globalComponents)){
                    if(this.componentNameMatch(name, n, originalName)){
                        //通过名称查找全局组件
                        return value;
                    }
                }
            },

            //解析组件模板
            parseTemplate: function (arg, flag) {
                let div = this.createLabel('div');
                div.innerHTML = arg
                if (flag) {
                    return div;
                }
                if(div.children.length > 0){
                    return div.children[0];
                }else{
                    return div.childNodes[0];
                }
            },
            //通过名称生成标签
            createLabel: function (name) {
                return document.createElement(name);
            },
            //引入组件样式
            importComponentStyle: function (newCom, com) {
                if (newCom && com && com.style) {
                    let style = newCom.style.value;
                    let comStyle = com.style.value;
                    style = style ? style : '';
                    comStyle = comStyle ? comStyle : '';
                    style += comStyle;
                    newCom.style.value = style;
                }
            },
            //添加已渲染到组件的组件
            //comObj存储组件
            //newCom存储位置
            addBloatedComponent: function (comObj, newCom) {
                if(comObj && newCom) {
                    let name = comObj.name;
                    let flag = this.isComponentKeyHas(comObj, newCom);
                    if (flag) {
                        //存在组件
                        let arr = newCom.childrenDom.get(name);
                        arr.push(comObj);
                    } else {
                        //不存在组件
                        //定义一个数组
                        let arr = new Array();
                        arr.push(comObj);
                        newCom.childrenDom.set(name, arr);
                    }
                }
            },
            //检测渲染对象里是否有key
            isComponentKeyHas: function (comObj, newCom) {
                return newCom.childrenDom.has(comObj.name);
            },
            /**
             * 解析组件标签的ref
             * @param attr
             * @param dom
             * @param comObj
             */
            parseComponentLabelRef: function (attr, dom, comObj) {
                this.parseComponentRef(attr, dom, comObj);
            },

            /**
             * 解析组件标签m-js
             * @param attr 属性
             * @param comObj   组件对象
             * @param childComObj 子组件对象
             */
            parseComponentLabelMJs: function (attr, comObj, childComObj) {
                //解析组件标签m-js
                this.parseAttrMJS(attr, function (obj) {
                    if (!childComObj.$emits) {
                        childComObj.$emits = {};
                    }
                    //解析驼峰命名
                    obj.incidentName = this.parseHumpName(obj.incidentName);
                    //解析函数参数列表
                    let parameterAdd = [];
                    let parseObj = this.parseFunctionParameterList(obj.value);
                    if(parseObj){
                        obj.value = parseObj.funName;
                        for(let c of parseObj.nameList){
                            let v = this.parseFrameString(comObj, c);
                            parameterAdd.push(v);
                        }
                    }
                    childComObj.$emits[obj.incidentName] = function (...arr) {
                        comObj[obj.value].apply(comObj, parameterAdd.concat(arr));
                    }
                }, this);
            },

            /**
             * 解析驼峰命名
             * @param name
             */
            parseHumpName: function (name) {
                let str = '';
                if (name && name.constructor === String) {
                    let strArr = name.split('-');
                    str = strArr[0];
                    for (let i = 1; i < strArr.length; i++) {
                        if(strArr[i]) {
                            str += strArr[i].charAt(0).toUpperCase() + strArr[i].substring(1);
                        }
                    }
                }
                return str;
            },
            /**
             * 解析组件ref
             * @param attr 属性对象
             * @param dom  属性对象所在的dom元素
             * @param comObj dom元素所在的组件
             */
            parseComponentRef: function (attr, dom, comObj) {
                let name = attr.name;
                if (name === 'ref') {
                    //添加refs属性
                    let refs = comObj.$refs[attr.value];
                    if (refs) {
                        refs.push(dom);
                    } else {
                        let arr = new Array();
                        arr.push(dom);
                        comObj.$refs[attr.value] = arr;
                    }
                    //删除dom属性
                    if (dom.constructor === HTMLHeadingElement) {
                        dom.removeAttribute('ref');
                    }
                }
            },
            //组件样式初始化
            componentStyleInit: function (newCom) {
                if (newCom.template) {
                    let dom = this.parseTemplate(newCom.template, true);
                    let style = newCom.style;
                    if (style) {
                        let str = style.value;
                        str = this.stringFormat(str);
                        let ex = /[^{}]*?{[^{}]*?}/g;
                        if (style.scoped) {
                            let exec;
                            //设置组件标签局部属性
                            let uuid = 'm-css-' + this.getUUid(16);
                            let uuidStr = '[' + uuid + ']';
                            //将写入组件样式uuid属性
                            newCom.style.uuid = uuid;

                            while(exec = ex.exec(str)){
                                let addIndex = exec.index;
                                let ex1 = /^[^{}]*/g;
                                let exec1 = ex1.exec(exec[0]);
                                if(exec1 && (exec1.length > 0) && exec1[0] && (exec1[0].search('@') === -1) && (exec1[0].search(':') === -1)){
                                    addIndex += exec1.index;
                                    let s = exec1[0];
                                    let split = s.split(',');
                                    let addNum = split.length > 0 ? 1 : 0;
                                    for(let s1 of split){
                                        let search = s1.search(':');
                                        let name = '';
                                        if(search === (-1)){
                                            name = s1;
                                            addIndex += s1.length;
                                        }else{
                                            name = s1.substring(0, search);
                                            addIndex += search;
                                        }
                                        str = str.slice(0, addIndex) + uuidStr + str.slice(addIndex);
                                        if(search !== (-1)){
                                            addIndex += s1.length - search;
                                        }
                                        addIndex += uuidStr.length + addNum;
                                        ex.lastIndex += uuidStr.length;
                                    }
                                }
                            }
                            //写入dom的uuid
                            this.writeDomUUID(dom, uuid);
                            //将组件模板更新
                            newCom.template = dom.innerHTML;
                        }
                        //将组件样式进行更新
                        newCom.style.value = str;
                    }
                }
            },

            /**
             * 写入dom的uuid
             * @param dom
             * @param uuid
             */
            writeDomUUID: function (dom, uuid) {
                for (let e of dom.children) {
                    this.writeDomUUID(e, uuid);
                }
                dom.setAttribute(uuid, '');
            },
            //字符串格式化
            stringFormat: function (str) {
                let string = '';
                if (str) {
                    //通过换行符切割字符串
                    let arrStr = str.split(/\r\n|\n/g);
                    for (let s of arrStr) {
                        if (s) {
                            //去掉首位空格
                            s = s.trim()
                            if (s) {
                                s = this.deleteCharFront(s, ' ', '{');
                                string += s;
                            }
                        }
                    }
                }
                string = string.replace(/\/\*.*?\*\//g, '');
                return string;
            },
            //删除指定字符之前的字符
            deleteCharFront: function (str, dc, rc) {
                let reg = new RegExp(rc, 'g');
                let i = 0, j = 0;
                while (true && (i < (Number.MAX_VALUE - 1))) {
                    let execs = reg.exec(str)
                    if (!execs) {
                        break;
                    }
                    let end = execs.index;
                    let start = end;
                    j = 0;
                    while (true) {
                        start--;
                        if ((str.charAt(start) !== dc || start < 0) && (j < (Number.MAX_VALUE - 1))) {
                            break;
                        }
                        j++;
                    }
                    start++;
                    if (start != end) {
                        str = str.substring(0, start) + str.substring(end);
                    }
                    i++;
                }
                return str;
            },
            //添加字符到字符串位置
            //str: 字符串
            //rc: 查找为的字符串 {
            //as: 添加的字符
            //start：起始位置
            addCharToString: function (str, rc, as, start) {
                //获取已经查找过字符串
                let sf = str.substring(0, start);
                //获取没有查找过得字符串
                let s = str.substring(start);
                //查找rc下标位置
                let se = s.search(rc); //7
                if (se > -1) {
                    s = sf + s.substring(0, se) + as + s.substring(se);
                }
                return {
                    index: start + se + as.length + 1,
                    str: s
                };
            },
            //深度复制对象
            copyObject: function (newObj, copyObj) {
                for (const o in copyObj) {
                    let value = copyObj[o];
                    if (value) {
                        if (value.constructor === Object) {
                            newObj[o] = {};
                            this.copyObject(newObj[o], value);
                        } else if (value.constructor === Array) {
                            newObj[o] = [];
                            this.copyObject(newObj[o], value);
                        } else if (value.constructor === Map) {
                            newObj[o] = new Map();
                            this.copyObject(newObj[o], value);
                        } else {
                            newObj[o] = value;
                        }
                    } else {
                        newObj[o] = value;
                    }
                }
            },

            /**
             * 解析函数参数列表
             * @param str
             * @returns
             */
            parseFunctionParameterList: function (str) {
                let ex = /\(.*?\)/.exec(str);
                if(ex && ex.length != 0) {
                    let e = ex[0];
                    e = e.trim();
                    if(e) {
                        let funName = str.replace(e, '');
                        e = e.substring(1, e.length - 1);
                        let nameList = [];
                        let split = e.split(',');
                        for(let s of split){
                            let s1 = s.trim();
                            if(s1){
                                nameList.push(s1) ;
                            }
                        }
                        return {
                            funName: funName,
                            nameList: nameList,
                            parameterList: e
                        }
                    }
                }
                return null;
            },

            /**
             * 解析组件m-js
             * @param attr 属性对象
             * @param dom  属性对象所在的dom元素
             * @param comObj dom元素所在的组件
             */
            parseComponentMJs: function (attr, dom, comObj) {
                this.parseAttrMJS(attr, function (obj) {
                    let funRun;
                    //解析函数参数列表
                    let parseObj = this.parseFunctionParameterList(obj.value);
                    if(parseObj){
                        let csStr= '';
                        obj.value = parseObj.funName;
                        for(let c of parseObj.nameList){
                            if(c != '$dom' && c != '$event'){
                                let v = this.parseFrameString(comObj, c);
                                csStr += `${v},`;
                            }else{
                                csStr += c + ',';
                            }
                        }
                        if(csStr){
                            csStr = csStr.substring(0, csStr.length - 1);
                            csStr = `obj.${obj.value}(${csStr})`;
                            funRun = new Function('$event', 'obj', '$dom', csStr);
                        }
                    }

                    //添加属性事件
                    let f = function () {
                        console.error(dom.outerHTML + ':不存在该事件！！！')
                    }
                    if (comObj[obj.value]) {
                        if(funRun){
                            f  = function (event) {
                                funRun(event, comObj, dom);
                            }
                        }else{
                            f  = function (event) {
                                comObj[obj.value](event, dom);
                            }
                        }
                    }
                    if (!dom['on' + obj.incidentName]) {
                        dom['on' + obj.incidentName] = f;
                    } else {
                        let f1 = dom['on' + obj.incidentName];
                        dom['on' + obj.incidentName] = function (event) {
                            f1(event);
                            f(event);
                        }
                    }
                    //删除属性
                    dom.removeAttribute(attr.name);
                }, this)
            },
            /**
             * 解析组件m-text
             * @param attr
             * @param dom
             * @param comObj
             */
            parseComponentMText: function (attr, dom, comObj) {
                let obj = this.searchAttrM(attr, /m-text/, 1);
                if (obj.flag) {
                    let runValue = this.parseFrameString(comObj, obj.value);
                    let that = this;
                    this.depNamesDispose(function (object, key, parameterObj) {
                        new Main.Subscriber(object, key, function () {
                            dom.innerHTML = that.parseFrameString(parameterObj, obj.value);
                        })
                    }, comObj.parseAddObjData);
                    dom.innerHTML = runValue;
                    //删除属性
                    dom.removeAttribute(attr.name);
                }
            },

            //解析组件js事件
            parseComponentIncident: function (dom, newCom) {
                //获取所有属性
                if (dom) {
                    let attrs = dom.attributes;
                    for (const [n, s] of Object.entries(attrs)) {
                        let obj = this.parseAttrMJS(s);
                        if (obj.flag) {
                            //删除属性
                            dom.removeAttribute(s.name);
                            //添加属性事件
                            dom['on' + obj.incidentName] = function () {
                                if (newCom[obj.value]) {
                                    newCom[obj.value]();
                                }
                            }
                        }
                    }
                    let child = dom.children;
                    for (let c of child) {
                        this.parseComponentIncident(c, newCom)
                    }
                }
            },
            /**
             * 解析属性m-js
             * @param attr 属性
             * @param fun  运行函数
             * @param obj
             */
            parseAttrMJS: function (attr, fun, obj) {
                this.parseAttrM(attr, /m-js/, fun, obj);
            },
            /**
             * 解析组件m-attr
             * @param attr 属性对象
             * @param dom  属性对象所在的dom元素
             * @param comObj dom元素所在的组件
             */
            parseComponentMAttr: function (attr, dom, comObj) {
                this.parseAttrMAttr(attr, function (obj) {
                    //得到m-attr解析值
                    let runObj = this.parseFrameString(comObj, obj.value);
                    let that = this;
                    this.depNamesDispose(function (object, key, parameterObj, length) {
                        if (length === 2 && obj.incidentName === 'value' && dom.tagName.toLocaleLowerCase() === 'input') {
                            let f = function () {
                                object[key] = dom.value;
                            }
                            if (!dom.oninput) {
                                dom.oninput = f;
                            } else {
                                let f1 = dom.oninput;
                                dom.oninput = function () {
                                    f1();
                                    f();
                                }
                            }
                        }
                        new Main.Subscriber(object, key, function () {
                            let v = that.parseFrameString(parameterObj, obj.value);
                            let o = {value: v};
                            that.parseMAttrAttrBefore(0, o, attr, dom, comObj);
                            let value = that.parseSpecialMAttrString(obj.incidentName, dom, o.value, runObj);
                            runObj = value;
                            that.addDomAttr(dom, obj.incidentName, value);
                        })
                    }, comObj.parseAddObjData)

                    let o = {value: runObj};
                    this.parseMAttrAttrBefore(0, o, attr, dom, comObj);
                    runObj = o.value;

                    //特殊属性处理
                    runObj = this.parseSpecialMAttrString(obj.incidentName, dom, runObj);
                    //添加dom属性
                    this.addDomAttr(dom, obj.incidentName, runObj);
                    //删除属性
                    dom.removeAttribute(attr.name);
                }, this);
            },
            /**
             * 解析组件标签m-attr
             * @param attr 属性
             * @param comObj   组件对象
             * @param childComObj 子组件对象
             */
            parseComponentLabelMAttr: function (attr, comObj, childComObj) {
                this.parseAttrMAttr(attr, function (obj) {
                    //添加解析组件标签属性
                    this.addComponentLabelAttr(obj.incidentName, obj.value, 0, childComObj, comObj);
                }, this);
            },

            /**
             * 添加解析组件标签属性
             * @param name
             * @param value
             * @param type
             * @param comObj
             * @param parentComObj
             */
            addComponentLabelAttr: function (name, value, type, comObj, parentComObj) {
                let flag = this.parseComponentProps(name, value, type, comObj, parentComObj);
                if (!flag) {
                    let dom = comObj.elDom;
                    let runValue = value;
                    if (type === 0) {
                        let that = this;
                        runValue = this.parseFrameString(parentComObj, value);
                        let o = {value: runValue};
                        this.parseMAttrAttrBefore(1, o, null, dom, comObj);
                        runValue = o.value;
                        this.depNamesDispose(function (object, key, parameterObj) {
                            new Main.Subscriber(object, key, function () {
                                let pv = that.parseFrameString(parameterObj, value);
                                let o = {value: pv};
                                that.parseMAttrAttrBefore(1, o, null, dom, comObj);
                                let v = that.parseSpecialMAttrString(name, dom, o.value, runValue);
                                runValue = v;
                                that.addDomAttr(dom, name, runValue);
                            })
                        }, parentComObj.parseAddObjData);
                    }
                    //特殊属性处理
                    runValue = this.parseSpecialMAttrString(name, dom, runValue);
                    //添加dom属性
                    this.addDomAttr(dom, name, runValue)
                }
            },
            /**
             * 添加dom属性
             * @param dom  dom元素
             * @param attrName 属性名称
             * @param attrValue 属性值
             */
            addDomAttr: function (dom, attrName, attrValue) {
                if(!(dom instanceof HTMLElement)) {
                    return;
                }
                //写入属性
                if (attrName === 'class') {
                    let className = dom.className;
                    className = className ? className + ' ' : '';
                    dom.className = className + attrValue;
                } else if (attrName === 'style') {
                    dom.style.cssText += attrValue;
                } else {
                    dom.setAttribute(attrName, attrValue);
                }
            },
            /**
             * 特殊属性处理
             * @param name
             * @param dom
             * @param attrValue
             */
            parseSpecialMAttrString: function (name, dom, attrValue, deleteAttr) {
                if (name === 'class') {
                    attrValue = this.parseClassMAttrString(dom, attrValue);
                    dom.className = this.parseSpecialDeleteMAttrString(name, dom.className, deleteAttr)
                } else if (name === 'style') {
                    attrValue = this.parseStyleMAttrString(dom, attrValue);
                    dom.style.cssText = this.parseSpecialDeleteMAttrString(name, dom.style.cssText, deleteAttr)
                }
                return attrValue;
            },

            /**
             * 特殊属性删除处理
             * @param name
             * @param attrValue
             * @param deleteAttr
             */
            parseSpecialDeleteMAttrString: function (name, attrValue, deleteAttr) {
                let attrArr;
                let deleteArr;
                let str = ' ';
                let sp = '';
                if (!deleteAttr) {
                    return attrValue;
                }
                if (name === 'class') {
                    sp = ' ';

                } else if (name === 'style') {
                    sp = ';';
                }
                if (name === 'class' || name === 'style') {
                    attrArr = this.splitString(attrValue, sp);
                    deleteArr = this.splitString(deleteAttr, sp);
                    for (let d of deleteArr) {
                        for (let i = 0; i < attrArr.length; i++) {
                            if (d === attrArr[i]) {
                                attrArr.splice(i, 1);
                                break;
                            }
                        }
                    }
                    for (let a of attrArr) {
                        str += a + sp;
                    }
                }
                return str.substring(0, str.length - 1);
            },

            /**
             * 切割字符串
             * @param str
             * @param sp
             */
            splitString: function (str, sp) {
                let arr = [];
                if (str) {
                    let arrStr = str.split(sp);
                    for (let s of arrStr) {
                        s = s.trim();
                        if (s) {
                            arr.push(s);
                        }
                    }
                }
                return arr;
            },

            /**
             * 解析class m-attr字符串
             * @param dom  dom元素
             * @param attrValue 属性值
             */
            parseClassMAttrString: function (dom, attrValue) {
                let str = '';
                switch (attrValue.constructor) {
                    case Object:
                        for (const [name, value] of Object.entries(attrValue)) {
                            if (value) {
                                str += name + ' ';
                            }
                        }
                        break;
                    case Array:
                        for (let a of attrValue) {
                            str += a + ' ';
                        }
                        break;
                    default:
                        str = attrValue + ' ';
                }
                return str.substring(0, str.length - 1);
            },
            /**
             * 解析style m-attr字符串
             * @param dom  dom元素
             * @param attrValue 属性值
             */
            parseStyleMAttrString: function (dom, attrValue) {
                let str = '';
                switch (attrValue.constructor) {
                    case Object:
                        let div = this.createLabel('div');
                        for (const [name, value] of Object.entries(attrValue)) {
                            div.style[name] = value;
                        }
                        str = div.style.cssText;
                        break;
                    case Array:
                        for (let a of attrValue) {
                            str += a + ';';
                        }
                        break;
                    default:
                        str = attrValue + ';';
                }
                return str;
            },
            /**
             * 解析框架字符串
             * @param comObj 组件对象
             * @param value 获取的值
             * @param flag 是否运行函数 真：运行
             */
            parseFrameString: function (comObj, value) {
                value = this.disposeMAttrString(comObj, value);
                return value;
            },
            /**
             * 处理m-attr字符串
             * @param comObj 组件对象
             * @param mAttrValue m-attr的值
             */
            disposeMAttrString: function (obj, value) {
                // console.log(obj.name)
                // console.log(value)
                let newObj = obj;
                //唯一变量名
                let uuid = '_m' + this.getUUid(16);
                let str1 = `let ${uuid} = null;`;
                let str2 = `${uuid} = ${value};`;
                let str3 = `return ${uuid};`;
                let runStr = str1 + str2 + str3;
                let result;
                try {
                    Main.Dep.names = [];
                    let wObj = this.addObjectAttrToGlobal(newObj);
                    result = this.stringToFunRun(newObj, runStr);
                    //注意：实现函数里面不能读取对象里的值否则会改变Dep.names的值导致处理有问题
                    this.removeObjectAttrToGlobal(newObj, wObj);
                } catch (e) {
                    console.error(obj.name + '组件>' + e);
                }
                return result;
            },

            /**
             * 添加对象属性到全局对象中
             * @param obj
             */
            addObjectAttrToGlobal: function (obj) {
                let obj1 = {}
                Object.keys(obj).forEach(function (key) {
                    let v = global[key];
                    if (v !== undefined) {
                        obj1[key] = v;
                    }
                    try {
                        Object.defineProperty(global, key, {
                            enumerable: false,
                            configurable: true,
                            get: function proxyGetter() {
                                return obj[key];
                            },
                        });
                    } catch (e) {
                        console.error(e)
                    }
                })
                return obj1;
            },
            /**
             * 删除全局对象中的对象属性
             *
             * @param obj
             */
            removeObjectAttrToGlobal: function (obj, wObj) {
                Object.keys(obj).forEach(function (key) {
                    delete global[key]
                })
                Object.keys(wObj).forEach(function (key) {
                    global[key] = wObj[key];
                })
            },
            /**
             * 将对象所有属性转为 let 属性名 = this.属性名
             * @param obj
             * @returns {string}
             */
            createObjectToString: function (obj) {
                if (obj) {
                    let str = '';
                    for (const [name, value] of Object.entries(obj)) {
                        str += `let ${name} = this.${name};`;
                    }
                    return str;
                }
                return '';
            },
            /**
             * 将字符串当做函数运行
             * @param runObj 运行函数的对象
             * @param str  运行函数代码
             * @returns {*}
             */
            stringToFunRun: function (runObj, str) {
                let value;
                let fun = new Function(str);
                value = this.objectCallFunRun(runObj, fun)
                return value;
            },
            /**
             * 通过对象调用函数
             * @param obj
             * @param fun
             * @returns {*}
             */
            objectCallFunRun: function (obj, fun) {
                return fun.apply(obj);
            },
            /**
             * 运行函数
             * @param fun
             * @param parameters
             */
            runFunction: function (fun, ...parameters) {
                if (fun && (fun.constructor === Function)) {
                    fun.apply(this, parameters);
                }
            },
            /**
             * 解析属性m-attr
             * @param attr 属性
             * @param fun 运行函数
             * @param obj
             */
            parseAttrMAttr: function (attr, fun, obj) {
                this.parseAttrM(attr, /m-attr/, fun, obj);
            },
            /**
             * 解析m属性
             * @param attr
             * @param searchStr
             * @param fun
             * @param obj
             */
            parseAttrM: function (attr, searchStr, fun, obj) {
                //解析m-attr
                let value = this.searchAttrM(attr, searchStr);
                if (value.flag) {
                    obj.fun = fun;
                    obj.fun(value);
                    delete obj.fun;
                }
            },
            /**
             * 查找m属性
             * @param attr 属性对象
             * @param parseValue 查找正则表达式
             * @param num 查找个数
             * @returns {{flag: boolean}} 查找完成对象
             */
            searchAttrM: function (attr, parseValue, num) {
                let obj = {flag: false}
                num = num ? num : 2;
                let name = attr.name;
                let search = name.search(parseValue);
                if (search > -1) {
                    let arr = name.split(':');
                    if (arr.length >= num) {
                        let incidentName = ' ';
                        if (num === 2) {
                            incidentName = arr[1];
                        }
                        let value = attr.value;
                        if (incidentName) {
                            obj.flag = true;
                            obj.incidentName = incidentName;
                            obj.value = value;
                        }
                    }
                }
                return obj;
            },
            //将样式添加到head
            addStyleToHead: function (styleStr) {
                let style = this.createLabel('style');
                style.innerHTML = styleStr;
                let heads = document.getElementsByTagName('head');
                if (heads.length > 0) {
                    heads[0].appendChild(style);
                    return style;
                }
            },

            /**
             * 将style标签样式添加到head
             * @param label
             */
            addStyleLabelToHead: function (label) {
                let heads = document.getElementsByTagName('head');
                if (heads.length > 0) {
                    heads[0].appendChild(label);
                }
            },
            /**
             * 解析组件值传递
             * @param name
             * @param runValue
             * @param comObj
             * @returns {boolean}
             */
            parseComponentProps: function (name, value, type, comObj, parentComObj) {
                //解析驼峰
                name = this.parseHumpName(name);
                let prop = comObj.$props[name];
                if (prop !== undefined) {
                    let that = this;
                    if (type === 0) {
                        value = this.parseFrameString(parentComObj, value);
                    }
                    comObj.$props[name] = value;

                    return true;
                }
                return false;
            },

            /**
             * 格式组件的Props
             * @param comObj
             */
            formatComponentProps: function (comObj) {
                let props = comObj.props;
                let that = this;
                if (props) {
                    comObj.$props = {};
                    let arr = Object.keys(props);
                    if (arr.length > 0) {
                        if (props.constructor === Array) {
                            Object.keys(props).forEach(function (key) {
                                comObj.$props[key] = null;
                            });
                        } else if (props.constructor === Object) {
                            Object.keys(props).forEach(function (key) {
                                comObj.$props[key] = null;
                                if (props[key].constructor === Object) {
                                    let d = props[key].default;
                                    if(d && d.constructor === Function){
                                        comObj.$props[key] = d();
                                    }else{
                                        comObj.$props[key] = d === undefined ? null : d;
                                    }
                                }
                            });
                        }
                    }
                }
            },
            /**
             * 解析组件值传递类型检测函数
             * @param name
             * @param value
             * @param type
             * @param comObj
             * @param parentComObj
             */
            componentPropsTypeDetection: function (name, value, type, comObj, parentComObj) {
                let that = this;
                switch (type) {
                    case 0:
                        Object.defineProperty(comObj, name, {
                            enumerable: true,
                            configurable: true,
                            get: function proxyGetter() {
                                return that.parseFrameString(parentComObj, value);
                            }
                        });
                        break;
                    case 1:
                        comObj[name] = value;
                        break;
                }
            },


            /**
             * 解析普通属性
             * @param attr
             * @param dom
             * @param comObj
             * @returns {boolean}
             */
            parseOrdinaryAttr: function (attr, dom, comObj) {
                let attrName = attr.name;
                let mJs = /^m-js:/.test(attrName)
                let mAttr = /^m-attr:/.test(attrName)
                let mText = /^m-text:/.test(attrName)
                if (!(attrName === 'ref' || mJs || mAttr || mText)) {
                    this.parseOrdinaryAttrBefore(attr, dom, comObj);
                    return true;
                }
                return false;
            },
            /**
             * 解析组件标签的常规属性
             * @param attr
             * @param comObj
             */
            parseComponentLabelRoutine: function (attr, comObj) {
                let name = attr.name;
                if (this.parseOrdinaryAttr(attr, comObj.elDom, comObj)) {
                    //添加解析组件标签属性
                    this.addComponentLabelAttr(name, attr.value, 1, comObj);
                }
            },
            //生成唯一字符串
            getUUid: function (length) {
                return (Math.random().toString(36).substring(3) + Date.now().toString(36)).substring(0, length);
            }
        }
    };

    /**
     * 模块化导入
     * @param href
     * @returns {{input}|*}
     */
    Main.input = function (href) {
        function load(href) {
            let xhr = new XMLHttpRequest(),
                okStatus = document.location.protocol === "file:" ? 0 : 200;
            xhr.open('GET', href, false);
            xhr.overrideMimeType("text/html;charset=utf-8");//默认为utf-8
            xhr.send(null);
            return xhr.status === okStatus ? xhr.responseText : null;
        }

        //获取文件后缀
        function getType(file) {
            let filename = file;
            let index1 = filename.lastIndexOf(".") + 1;
            let index2 = filename.length;
            let type = filename.substring(index1, index2);
            return type;
        }

        let output;
        let jsStr = load(href);
        let type = getType(href);
        if (type === 'html' || type === 'main') {
            let div = document.createElement('div');
            div.innerHTML = jsStr;
            let templateText = div.getElementsByTagName('template')[0].innerHTML;
            //获取js数据
            let jsText = div.getElementsByTagName('script')[0].innerHTML;

            //解析style
            let style = div.getElementsByTagName('style')[0];
            let styleText = style.innerHTML;

            output = (new Function('let output = {};' + jsText + 'return output;'))();
            output.template = templateText;
            output.style = {
                scoped: style.hasAttribute('scoped'),
                value: styleText
            }

            //获取引入样式
            let inputStyleDoms = div.getElementsByTagName('input-style');
            if (inputStyleDoms.length > 0) {
                let inputStyleDom = inputStyleDoms[0];
                let children = inputStyleDom.children;
                for (let c of children) {
                    let name = c.tagName.toLocaleLowerCase();
                    if (name === 'scoped') {
                        let ch = c.children;
                        for (let l of ch) {
                            let name = l.tagName.toLocaleLowerCase();
                            if (name === 'list') {
                                let acc = l.innerText;
                                let str = load(acc);
                                output.style.value += str;
                            }
                        }
                    } else if (name === 'list') {
                        let acc = c.innerText;
                        if (output.input) {
                            let css = output.input.css;
                            if (css) {
                                if (css.constructor === String) {
                                    output.input.css = [];
                                    output.input.css.push(css);
                                    output.input.css.push(acc);
                                } else if (css.constructor === Array) {
                                    output.input.css.push(acc);
                                } else {
                                    output.input.css = [];
                                    output.input.css.push(acc);
                                }
                            } else {
                                output.input.css = [acc];
                            }
                        } else {
                            output.input = {
                                css: [acc]
                            }
                        }
                    }
                }
            }
        } else {
            output = (new Function('let output = {};' + jsStr + ';return output;'))();
        }
        return output;
    }

    /**
     * 获取项目地址
     * @returns {string}
     */
    Main.getRootPathWeb = function() {
        //获取当前网址，如： http://localhost:63342/swiper/html/index.html
        let curWwwPath = window.document.location.href;
        //获取主机地址之后的目录，如： swiper/html/index.html
        let pathName = window.document.location.pathname;
        let pos = curWwwPath.indexOf(pathName);
        //获取主机地址，如： http://localhost:63342
        let localhostPath = curWwwPath.substring(0, pos);
        //获取带"/"的项目名，如：/swiper/html
        let projectName = pathName.substring(0, pathName.substr(1).lastIndexOf('/') + 1);
        return localhostPath + projectName;
    }

    //写入项目地址
    Main.projectPath = Main.getRootPathWeb();
    Main.global = global;
    global.Main = Main;
    global.input = Main.input;
})(this);