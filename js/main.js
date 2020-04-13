;(function (global) {

    let MainGlobal = {
        //所有组件
        components: {},

        //数据劫持对象
        dataHijackObj: {}
    };

    //订阅器
    function Dep() {
        //订阅者容器
        this.subs = [];
        //增加一个订阅者
        this.addSub = function (sub) {
            this.subs.push(sub);
        };
        //运行所有的订阅者
        this.runAll = function () {
            console.log(this.subs);
            this.subs.forEach(function (obj) {
                obj.run();
            })
        }
    };


    //订阅者
    function Subscriber(data, name, fun) {
        //数据对象
        this.data = data;
        //数据名称
        this.name = name;
        //运行函数
        this.fun = fun;
        //添加到订阅器
        this.get = function () {
            Dep.objValue = data;
            Dep.value = this;
            let value = data[name];
            Dep.value = null;
            Dep.objValue = null;
            return value;
        }
        this.run = function () {
            let v = this.data[name];
            if(this.value != v || v.constructor === Array){
                this.value = v;
                this.fun();
            }
        }
        //执行添加订阅器
        this.value = this.get();
    }

    //组件原型
    let MainPrototypes = {
        name: 'Main',

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
        data: {},
        //存储ref名称dom集合
        $refs: {},

        //存储插槽对象
        $slots: {},

        //计算属性
        computes:{},

        //发送事件函数
        $emit: function (name, ...arr) {
            if (this.$emits[name]) {
                this.$emits[name].apply(this, arr);
            }
        },

        //自定义事件集合
        $emits: {},

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

        //组件相关函数对象
        methods: {}
    }


    //组件解析工具
    let MainTool = {
        //方法
        methods: {
            //合并配置并生成新的组件
            mergeConfig: function (obj) {
                //生成新的组件原型
                let prototypesObj = {};
                this.copyObject(prototypesObj, MainPrototypes);
                //将components写入children属性
                if (obj.components) {
                    obj.children = obj.components;
                }
                //合并配置
                for (const [name, value] of Object.entries(obj)) {
                    if (prototypesObj[name] && value.constructor === Object) {
                        for (const v in value) {
                            prototypesObj[name][v] = value[v];
                        }
                    } else {
                        prototypesObj[name] = value;
                    }
                }
                return prototypesObj;
            },
            //生成新的组件
            _init: function (obj) {
                //合并配置并生成新的组件
                let newCom = this.mergeConfig(obj);

                //初始化组件
                this.initComponent(newCom);

                //组件重置
                this.resetComponentObj(newCom);

                //解析组件m-if
                let mIfFlag = this.parseComponentMIF(newCom);
                //解析所有的类型标签
                if (mIfFlag) {
                    this.parseAllTypeLabel(newCom.elDom, newCom);
                }
                return newCom;
            },
            //初始化组件
            initComponent: function (newCom) {

                //将组件里的子组件转换为组件原型
                this.childComponentToPrototypes(newCom);

                //检测组件是否嵌套
                for (const [name, value] of Object.entries(newCom.children)) {
                    this.initComponent(value);
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

                //检测dom获取
                if (!newCom.elDom) {
                    return false;
                }
            },
            //将组件里的子组件转换为组件原型
            childComponentToPrototypes: function (newCom) {
                for (const [name, value] of Object.entries(newCom.children)) {
                    let com = this.mergeConfig(value);
                    newCom.children[name] = com;
                }
            },
            /**
             * 解析组件dom的子dom
             * @param dom 必须为普通的html dom
             * @param newCom 组件对象
             */
            parseComponentDomChild: function (dom, newCom) {
                if (dom) {
                    let child = dom.children;
                    for (let i = 0; i < child.length; i++) {
                        //解析所有的类型标签
                        this.parseAllTypeLabel(child[i], newCom, null, function (com) {
                            //组件模板替换
                            this.componentTemplateReplace(dom, com.elDom, child[i]);
                        }, null, function (obj) {
                            i += obj.num == 0 ? 0 : obj.num - 1;
                        });
                    }
                }
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
                if (dom) {
                    //检测当前dom不是组件根dom
                    if (dom !== comObj.elDom) {
                        //解析组件标签的m-for
                        let obj = this.parseComponentLabelMFor(dom, comObj);
                        this.runFunction(funMFor, obj);
                        if (obj.num > 0) {
                            return;
                        }
                    }
                    //解析组件插槽
                    let slotObj = this.parseComponentSlot(dom, comObj);
                    if (!slotObj) {
                        //通过名称获取组件
                        let com = this.getFindNameComponent(comObj, dom.tagName);
                        //获取到组件
                        if (com) {
                            //解析组件并替换
                            let newCom = this.parseComponent(com, dom, comObj);
                            this.runFunction(funCom, newCom);
                        } else {
                            //解析普通html标签
                            this.parseOrdinaryLabel(dom, comObj);
                            this.runFunction(funHtml, dom);
                        }
                    } else {
                        this.runFunction(funSlot, slotObj);
                    }
                }
            },
            /**
             *  解析组件
             * @param comPrototype
             * @param comLabel
             * @param parentCom
             */
            parseComponent: function (comPrototype, comLabel, parentCom) {
                //通过组件生成新的组件
                let copyCom = {}
                this.copyObject(copyCom, comPrototype);

                //通过组件生成新的dom
                this.createNewComElDom(copyCom);

                //组件对象重置
                this.resetComponentObj(copyCom);

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

                    //解析所有的类型标签
                    this.parseAllTypeLabel(copyCom.elDom, copyCom);

                    //引入组件样式
                    this.importComponentStyle(parentCom, copyCom);

                    //添加已渲染到组件的组件
                    this.addBloatedComponent(copyCom, parentCom);

                    //组件插槽替换
                    this.componentSlotReplace(comLabel, copyCom, parentCom);

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

                //解析组件子标签的m-if m-elif m-else
                this.parseComponentChildLabelMIF(dom, comObj);

                //解析组件dom的子dom
                this.parseComponentDomChild(dom, comObj);
            },
            //通过组件生成新的dom
            createNewComElDom: function (comObj) {
                comObj.elDom = this.createNewDom(comObj.elDom);
            },
            /**
             * 通过dom复制一个新的dom
             * @param dom
             */
            createNewDom: function (dom) {
                return dom.cloneNode(true);
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
             * 解析组件所有的属性和标签
             * @param dom
             * @param comObj
             */
            parseComponentAllAttrAndLabel: function (dom, comObj) {
                //解析组件属性
                this.parseComponentAttr(dom, comObj);
                //解析组件文本
                this.parseComponentText(dom, comObj);
                //解析组件dom
                // console.log(dom);
                // this.parseComponentDom(dom, comObj);
            },


            /**
             * 解析组件属性
             * @param dom 组件elDom
             * @param comObj 组件对象
             */
            parseComponentAttr: function (dom, comObj) {
                //获取dom元素属性
                let attrs = dom.attributes;
                let newAttrs = [];
                for (const a of attrs) {
                    let obj = {};
                    obj.name = a.name;
                    obj.value = a.value;
                    newAttrs.push(obj);
                }
                //解析每一个属性
                for (let a of newAttrs) {
                    //解析ref
                    this.parseComponentRef(a, dom, comObj);
                    //解析m-attr
                    this.parseComponentMAttr(a, dom, comObj);
                    //解析组件m-js
                    this.parseComponentMJs(a, dom, comObj);
                    //解析组件m-text
                    this.parseComponentMText(a, dom, comObj);
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
                                    new Subscriber(object, key, function () {
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
                let attrs = labelDom.attributes;
                for (let a of attrs) {
                    //解析组件标签ref
                    this.parseComponentLabelRef(a, childComObj.elDom, comObj);

                    //解析组件标签常规属性
                    this.parseComponentLabelRoutine(a, childComObj);

                    //解析组件标签m-attr
                    this.parseComponentLabelMAttr(a, comObj, childComObj);

                    //解析组件标签m-js
                    this.parseComponentLabelMJs(a, comObj, childComObj);
                }
            },



            /**
             * 解析组件m-if
             * @param comObj
             */
            parseComponentMIF: function (comObj) {
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
                    // if (comObj[mIFValue]) {
                    //     let next = dom.nextSibling;
                    //     new Subscriber(comObj.data, mIFValue, function () {
                    //         if (comObj[mIFValue]) {
                    //             next.parentNode.insertBefore(dom, next);
                    //         } else {
                    //             dom.parentNode.removeChild(dom);
                    //         }
                    //     })
                    // }
                    let runValue = this.parseFrameString(comObj, mIFValue);
                    if (runValue) {
                        return true;
                    }
                }
                return false;
            },


            /**
             *  解析主键m-if显示元素
             * @param domArr
             * @param comObj
             */
            parseMIFDomClassify: function (domArr, comObj) {
                for (const d of domArr) {
                    let length = d.length;
                    for (let i = 0; i < length; i++) {
                        let v = d[i];
                        v.show = false;
                        if (v.name === 'm-else') {
                            v.show = true;
                            break;
                        }
                        let mIFFlag = this.parseMIFDispose(v.value, comObj, v.name);
                        if (mIFFlag) {
                            v.show = true;
                            break;
                        }
                    }
                }
            },

            /**
             * 更新m-if显示视图
             * @param domArr
             * @param comObj
             */
            updateMIFDom: function (domArr, comObj) {
                this.parseMIFDomClassify(domArr, comObj);
                for (const d of domArr) {
                    for (const c of d) {
                        if (!c.show) {
                            c.value.parentNode.removeChild(c.value);
                        }
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
                            ifs.push({name: 'm-elif', value: c, show: false});
                            continue;
                        } else {
                            flag = false;
                            let mELSE = c.hasAttribute('m-else');
                            domArr.push(ifs);
                            if (mELSE) {
                                ifs.push({name: 'm-else', value: c, show: false});
                                ifs = [];
                                continue;
                            }
                            ifs = [];
                        }
                    }
                    let mIF = c.hasAttribute('m-if');
                    if (mIF) {
                        ifs.push({name: 'm-if', value: c, show: false});
                        flag = true;
                    }
                }
                return domArr;
            },

            /**
             * 解析组件子标签的m-if m-elif m-else
             * @param dom
             * @param comObj
             */
            parseComponentChildLabelMIF: function (dom, comObj) {
                let child = dom.children;
                //解析m-if分组
                let domArr = this.parseMIFGrouping(child);
                // console.log(domArr);
                //更新m-if显示视图
                this.updateMIFDom(domArr, comObj);
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
                forRecordObj.doms.push(newDom);
                this.parseComponentAndAddObjData(newDom, comObj, addObjData);
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
                if(addObjData) {
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
                            Dep.names = [];
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
                if(addObjData) {
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
             * 解析单个dom的m-for
             * @param dom
             * @param comObj
             */
            parseDomMFOR: function (dom, comObj) {
                let obj = {num: 0, doms: []};
                let newDom = dom;
                let mForValue = dom.getAttribute('m-for');
                if (mForValue) {
                    //删除属性
                    dom.removeAttribute('m-for');
                    //解析m-for结构
                    let splits = mForValue.split(/\sof\s|\sin\s/);
                    if (splits.length === 2) {
                        let runValue = this.parseFrameString(comObj, splits[1]);
                        if (runValue) {
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
                            //删除当前节点
                            if (dom.parentNode) {
                                dom.parentNode.removeChild(dom);
                            }
                        }
                    } else {
                        console.error('for格式错误：' + c.tagName);
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
                if (parent.lastChild == targentElement) {
                    parent.appendChild(newElement);
                } else {
                    parent.insertBefore(newElement, targentElement.nextSibling);
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
             * 解析组件插槽
             * @param dom  被节点标签
             * @param comObj 组件对象
             */
            parseComponentSlot: function (dom, comObj) {
                let labelName = dom.tagName.toLowerCase();
                if (labelName === 'slot') {
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
                    if(names.length > 0) {
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
                let names = Dep.names;
                Dep.names = null;
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
                if(names.length > 1) {
                    // console.log(names)
                    if (names.length > 2) {
                        for (let i = names.length - 2; i > 1; i -= 2) {
                            if (names[i] === names[i - 2][names[i - 1]]) {
                                arr.push(i - 1);
                                arr.push(i - 2);
                            }else{
                                arr1.push(names[i]);
                                arr1.push(names[i + 1]);
                            }
                        }
                    }
                    arr1.push(names[0], names[1]);
                    if(addObjData){
                        for(const a of addObjData) {
                            if(a) {
                                Object.keys(a).forEach(function (key) {
                                    arr1.push(a);
                                    arr1.push(key);
                                })
                            }
                        }
                    }
                    let parameterObj = {};
                    for(let i = 0; i < arr1.length; i += 2){
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
                    for(let i = 0; i < names.length; i += 2){
                        fun(names[i], names[i + 1], parameterObj);
                    }
                }
            },

            /**
             * 组件插槽替换
             * @param dom  组件标签dom
             * @param comObj  组件对象
             * @param parentCom 组件标签所在的组件
             */
            componentSlotReplace: function (dom, comObj, parentCom) {
                //查找标签的m-slot
                let arrObj = this.searchLabelMSlot(dom);
                //替换插槽
                for (const [name, slot] of Object.entries(comObj.$slots)) {
                    //通过名称获取插槽对象
                    let obj = arrObj[name];
                    let slotDomArr = [];
                    for (const s of slot) {
                        let that = this;
                        let dom = s.dom;
                        if (obj) {
                            if (slotDomArr.length === 0) {
                                for (const d of obj.dom) {
                                    //解析dom并添加额外数据
                                    this.parseComponentAndAddObjData(d, parentCom, s[obj.value], null, function (com) {
                                        that.insertBefore(com.elDom, dom);
                                        slotDomArr.push(com.elDom);
                                    }, function (d) {
                                        slotDomArr.push(d);
                                        that.insertBefore(d, dom);
                                    }, function (obj) {
                                        let d = dom;
                                        for (const c of obj.doms) {
                                            that.insertAfter(c, d);
                                            d = c;
                                            slotDomArr.push(c);
                                        }
                                    });
                                }
                            } else {
                                for (const c of slotDomArr) {
                                    that.insertBefore(this.createNewDom(c), dom);
                                }
                            }
                        } else {
                            //使用插槽默认值
                            let childs = dom.children;
                            for (let i = 0; i < childs.length; i++) {
                                let child = childs[i];
                                this.parseAllTypeLabel(child, comObj, null, function (com) {
                                    //组件模板替换
                                    that.insertBefore(com.elDom, dom);
                                }, function (d) {
                                    that.insertBefore(d, dom);
                                }, function (obj) {
                                    let d = dom;
                                    for (const c of obj.doms) {
                                        that.insertAfter(c, d);
                                        d = c;
                                    }
                                });
                                i--;
                            }

                        }
                        this.deleteDomThis(dom);
                    }
                }
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
             * 组件对象重置
             * @param storageObj
             */
            resetComponentObj: function (storageObj) {
                for (const [name, value] of Object.entries(storageObj)) {
                    if (name === 'data' || name === 'methods') {
                        if (name === 'data') {
                            this.observe(value);
                        }
                        for (const v in value) {
                            this.resetComponentKeys(storageObj, name, v);
                            if(name === 'data'){
                                this.rewriteArrayPrototypeFun(value[v], value, v)
                            }
                        }
                    }
                }
                this.resetComponentComputes(storageObj);
                for (const [name] of Object.entries(storageObj.computes)) {
                    this.resetComponentKeys(storageObj, 'computes', name);
                }
            },

            /**
             * 数据劫持
             * @param obj
             * @param name
             * @param value
             */
            dataHijack: function (obj, name, value) {
                this.observe(value);
                let dep = new Dep();
                let that = this;
                Object.defineProperty(obj, name, {
                    configurable: true,
                    get: function () {
                        that.depIndirectDispose(dep, obj, name);
                        return value;
                    },
                    set: function (v) {
                        console.log('值发生改变' + value + "----->" + v);
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
            resetComponentComputes:  function (comObj) {
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
                if (Dep.objValue === obj && dep) {
                    dep.addSub(Dep.value);
                }
                if (Dep.names) {
                    Dep.names.push(obj)
                    Dep.names.push(name)
                }
            },

            /**
             * 计算属性数据劫持
             * @param obj
             * @param name
             * @param value
             * @param comObj
             */
            computesDataHijack: function(obj, name, value, comObj){
                let constructor = value.constructor;
                let dep = new Dep();
                let that = this;
                if(constructor === Function){
                    Object.defineProperty(obj, name, {
                        enumerable: true,
                        configurable: true,
                        get: function () {
                            that.depIndirectDispose(dep, obj, name);
                            return value.call(comObj);
                        }
                    });
                }else if(constructor === Object){
                    let obj1 = {
                        enumerable: true,
                        configurable: true
                    };
                    if(value.get){
                        obj1.get = function () {
                            let get = value.get;
                            that.depIndirectDispose(dep, obj, name);
                            if(get && get.constructor === Function){
                                return value.get.call(comObj);
                            }else if(value.constructor === Function){
                                return value.call(comObj);
                            }
                            return value;
                        }
                    }
                    if(value.set){
                        if(value.set.constructor === Function){
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
                        if(name.constructor === Object){
                            return name[key];
                        }else{
                            return storageObj[name][key];
                        }
                    },
                    set: function proxySetter(newVal) {
                        if(name.constructor === Object){
                            name[key] = newVal;
                        }else{
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
                if(arr && arr.constructor === Array){
                    let that = this;
                    //所有的数组共用一个原型对象所以这里重写创建一个数组原型对象
                    let proto = Object.create(Array.prototype);
                    proto.push = function (...items) {
                        for(const v of items){
                            this[this.length] = v;
                        }
                        obj[name] = this;
                    }
                    proto.unshift = function(...items){
                        let len = items.length;
                        let thisLen = this.length;
                        let arr = []
                        for(let i = 0; i < thisLen; i++){
                            arr[i] = this[i];
                        }
                        for(let i = 0; i < len; i++){
                            this[i] = items[i];
                        }
                        for(let i = 0; i < thisLen; i++){
                            this[i + len] = arr[i];
                        }
                        obj[name] = this;
                    }
                    proto.pop = function () {
                        if(this.length > 0) {
                            this.length -= 1;
                        }
                        obj[name] = this;
                    }
                    proto.shift = function(){
                        if(this.length > 0) {
                            let thisLen = this.length;
                            for(let i = 0; i < thisLen - 1; i++){
                                this[i] = this[i + 1];
                            }
                            this.length -= 1;
                        }
                        obj[name] = this;
                    }
                    proto.splice = function(start, deleteCount){
                        if(this.length > 0 && start > -1 && deleteCount > 0) {
                            let thisLen = this.length;
                            for(let i = start; i < thisLen - deleteCount; i++){
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
                name = name.toLowerCase();
                let com = this.getFindNamePartComponent(newCom, name);
                if (!com) {
                    com = this.getFindNameGlobalComponent(newCom, name);
                }
                return com;
            },
            //通过名称获取局部组件
            getFindNamePartComponent: function (newCom, name) {
                //通过名称查找局部组件
                for (let n in newCom.children) {
                    if (name === newCom.children[n].name) {
                        return newCom.children[n];
                    }
                }
            },
            //通过名称获取全局组件
            getFindNameGlobalComponent: function (newCom, name) {
                //通过名称查找全局组件
                for (let n in MainGlobal.components) {
                    if (name === MainGlobal.components[n].name) {
                        return MainGlobal.components[n];
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
                return div.children[0];
            },
            //通过名称生成标签
            createLabel: function (name) {
                return document.createElement(name);
            },
            //引入组件样式
            importComponentStyle: function (newCom, com) {
                if (com && com.style) {
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
                    childComObj.$emits[obj.incidentName] = function (...arr) {
                        comObj[obj.value].apply(comObj, arr);
                    }
                }, this);
            },

            /**
             * 解析驼峰命名
             * @param name
             */
            parseHumpName: function (name) {
                let str = '';
                if (name.constructor === String) {
                    let strArr = name.split('-');
                    str = strArr[0];
                    for (let i = 1; i < strArr.length; i++) {
                        str += strArr[i].charAt(0).toUpperCase() + strArr[i].substring(1);
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
                    dom.removeAttribute('ref');
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
                        if (style.scoped) {
                            //局部样式
                            let reg = /[\{][^\}]*\}/g;
                            let arrStr = str.split(reg);
                            let startIndex = 0;
                            for (let s of arrStr) {
                                if (s) {
                                    let elms = dom.querySelectorAll(s);
                                    let uuid = 'm-css-' + this.getUUid(16);
                                    for (let e of elms) {
                                        e.setAttribute(uuid, '');
                                    }
                                    let obj = this.addCharToString(str, '{', '[' + uuid + ']', startIndex);
                                    startIndex = obj.index;
                                    str = obj.str;
                                }
                            }
                            //将组件模板更新
                            newCom.template = dom.innerHTML;
                        }
                        //将组件样式进行更新
                        newCom.style.value = str;
                    }
                }
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
             * 解析组件m-js
             * @param attr 属性对象
             * @param dom  属性对象所在的dom元素
             * @param comObj dom元素所在的组件
             */
            parseComponentMJs: function (attr, dom, comObj) {
                this.parseAttrMJS(attr, function (obj) {
                    //添加属性事件
                    dom['on' + obj.incidentName] = function () {
                        if (comObj[obj.value]) {
                            comObj[obj.value]();
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
                        new Subscriber(object, key, function () {
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
                    //特殊属性处理
                    let that = this;
                    this.depNamesDispose(function (object, key, parameterObj) {
                        new Subscriber(object, key, function () {
                            let value = that.parseSpecialMAttrString(obj.incidentName, dom, that.parseFrameString(parameterObj, obj.value), runObj);
                            runObj = value;
                            that.addDomAttr(dom, obj.incidentName, value);
                        }, comObj.parseAddObjData)
                    })
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
                    //得到m-attr解析值
                    // let runObj = this.parseFrameString(comObj, obj.value);

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
                    if(type === 0){
                        let that = this;
                        runValue = this.parseFrameString(parentComObj, value);
                        this.depNamesDispose(function (object, key, parameterObj) {
                            new Subscriber(object, key, function () {
                                let v = that.parseSpecialMAttrString(name, dom, that.parseFrameString(parameterObj, value), runValue);
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
            parseSpecialDeleteMAttrString: function(name, attrValue, deleteAttr){
                let attrArr;
                let deleteArr;
                let str = ' ';
                let sp = '';
                if(!deleteAttr){
                    return attrValue;
                }
                if (name === 'class') {
                    sp = ' ';

                } else if (name === 'style') {
                    sp = ';';
                }
                if(name === 'class' || name === 'style') {
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
                    for(let a of attrArr){
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
                if(str) {
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
                let newObj = obj;
                //唯一变量名
                let uuid = '_m' + this.getUUid(16);
                let str1 = `let ${uuid} = null;`;
                let str2 = `${uuid} = ${value};`;
                let str3 = `return ${uuid};`;
                let runStr = str1 + str2 + str3;
                let result;
                try{
                    Dep.names = [];
                    let wObj = this.addObjectAttrToGlobal(newObj);
                    result = this.stringToFunRun(newObj, runStr);
                    //注意：实现函数里面不能读取对象里的值否则会改变Dep.names的值导致处理有问题
                    this.removeObjectAttrToGlobal(newObj, wObj);
                }catch (e) {
                    console.error(e);
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
                    if(v !== undefined){
                        obj1[key] = v;
                    }
                    try{
                        Object.defineProperty(global, key, {
                            enumerable: false,
                            configurable: true,
                            get: function proxyGetter() {
                                return obj[key];
                            },
                        });
                    }catch (e) {

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
                let prop = comObj.$props[name];
                if (prop !== undefined) {
                    let that = this;
                    Object.defineProperty(comObj.$props, name, {
                        enumerable: true,
                        configurable: true,
                        get: function () {
                            let v = null;
                            if(type === 0){
                                v =  that.parseFrameString(parentComObj, value);
                            }else if(type === 1){
                                v = value;
                            }
                            that.depIndirectDispose(null, comObj.$props, name);
                            return v;
                        },
                    });
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
                if(props){
                    comObj.$props = {};
                    if(props.constructor === Array){
                        Object.keys(props).forEach(function (key) {
                            comObj.$props[key] = null;
                        });
                    }else if(props.constructor === Object){
                        Object.keys(props).forEach(function (key) {
                            comObj.$props[key] = props[key].default;
                            if(comObj.$props[key] === undefined){
                                comObj.$props[key] = null;
                            }
                        });
                    }
                    Object.keys(comObj.$props).forEach(function (key) {
                        Object.defineProperty(comObj, key, {
                            enumerable: true,
                            configurable: true,
                            get: function proxyGetter() {
                                return comObj.$props[key];
                            }
                        });
                    });
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
                switch(type){
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
             * 解析组件标签的常规属性
             * @param attr
             * @param comObj
             */
            parseComponentLabelRoutine: function (attr, comObj) {
                let name = attr.name;
                let mJs = this.searchAttrM(attr, /m-js/);
                let mAttr = this.searchAttrM(attr, /m-attr/);
                if (!(name === 'ref' || mJs.flag || mAttr.flag)) {
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
     * 组件管理库
     * @param obj
     * @constructor
     * obj as Object
     * components：组件注册属性 as Object
     */
    function Main(obj) {
        let com = MainTool.methods._init(obj);
        //添加样式
        MainTool.methods.addStyleToHead(com.style.value);
        return com;
    }

    /**
     * 注册全局组件
     * @param com
     */
    Main.component = function (com) {
        //初始化组件
        let newCom = MainTool.methods._init(com);
        //写入全局组件
        MainGlobal.components[newCom.name] = newCom;
    };


    global.Main = Main;
})(this);