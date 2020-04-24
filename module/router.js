(function (global) {
    let router = function(){
        this.name = 'router';
        this.mounted = function () {
            // console.log(this)
            router.value.log = this.log;
        }
        this.methods = {
            log: function () {

            }
        }
    }
    //添加插件是运行
    router.initAll = function () {
        router.value = {};
    }
    //添加组件时调用调用
    router.addComponent = function(comObj){
        // console.log(comObj);
        comObj.$router = router.value;
    }
    global.router = router;
})(this)