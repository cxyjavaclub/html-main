;(function (global) {
    let swiper = {
        name: 'swiper', //组件名称
        style: {
            scoped: true, //局部css样式
            value: `
                .swiper{        
                    background-color: #FFFFFF;
                } 
                p {    
                    color: red;     
                }                   
                img {
                    background-color: red; 
                }  
                         
            ` //样式内容
        },  //组件样式
        components:{
            sw:{
                name: 'sw',
                style: {
                    scoped: true, //局部css样式
                    value: `
                        div{
                            color: red;
                        }
                    ` //样式内容
                },
                template: `
                    <div class="sw">12121
                        <p>789</p>
                        <i>qw</i>
                    </div>
                `,
                data:{
                   num: 12,
                }
            }
        },
        template: `
                <div>
                <slot name="">
                
</slot>
<!--                     <h2 m-js:click="h1Click">swiper</h2>-->
                     <slot>
                        <h2>默认插槽</h2>
                     </slot>                                                                                                                                                                                                                                                                                       
<!--                    <img m-js:click="setColor" ref="swiper-img" src="img/2.jpg">                        -->
                    <slot name="div" m-attr:num="age.time">
                        <h2>div插槽</h2>
                   </slot>  
                 
                    <slot name="new">
                        <h2>new插槽</h2>
                    </slot>   
                    <h1 m-js:click="h1Click">我是swiperH1</h1>
                </div>
            `, //组件模板（html）
        props:{
            excessTime:{
                type: Object
            },
            e:{
                type: Object
            },
            time:{
                type: Function
            }
        },
        //数据
        data:{
            flag: false,
            className: 'num',
            num: 10, //轮播图片个数
            index: 1, //当前显示图片下标
            width: 0,// 组件宽度
            excessTime: 0,//轮播图过度动画时间
            pauseTime: 0,//轮播图停顿时间
            age: {
                time: 'age1000'
            }
        },
        //组件加载运行
        mounted: function () {
            console.log(789)
            // this.test();
            // this.setColor();
        },
        //方法
        methods:{
            getNum: function(){
                return 50;
            },
            //测试
            test: function () {
                console.log('我是test');
                // console.log(this.$refs['swiper-p-span']);
            },
            clickSpan: function(){
                console.log(this)
            },
            setColor: function () {
                console.log('setColor');
                this.$emit('imgClick');
            },
            swiperClick: function () {
                console.log('我是单击swiper div swiperClick');
            },
            swiperDblclick: function () {
                console.log('我是双击swiper div swiperDblclick');
            },
            h1Click: function () {
                console.log('swiper h1被点击');
                this.$emit('click');
            }
        }
    }
    global[swiper.name] = swiper;
})(this);