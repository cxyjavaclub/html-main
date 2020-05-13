let obj = {
    data: {
        aa: 12,
        dd:  789
    },
    fun: {
        cc: function(){
            this.test();
        },
        test: function () {
            console.log(this.dd);
        }
    }
}


/**
 * 数据劫持
 * @param obj
 * @param name
 * @param value
 */
function dataHijack(obj, name, value) {
    observe(value);
    Object.defineProperty(obj, name, {
        configurable: true,
        get: function () {
            console.log(name)
            return value;
        },
        set: function (v) {
            console.log('值发生改变' + value + "----->" + v);
            value = v;
        }
    })
}

/**
 * 数据监听
 * @param obj
 */
function observe(obj) {
    if(!obj || (obj.constructor !== Object && obj.constructor !== Array)){
        return;
    }
    Object.keys(obj).forEach(function (key) {
        dataHijack(obj, key, obj[key]);
    })
}

let cc = 123
// console.log('test')

// let cc = {
//     aa: 12,
//
//
// }

