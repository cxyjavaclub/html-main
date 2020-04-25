(function (global) {
    let questions = {
        name: 'questions',
        style:{

        },
        template:`
            <div>
<!--                {{serialNumber}}{{topicSplit}}<h1>{{topic}}</h1>-->
                <slot></slot>
                {{topic}}
            </div>
        `,
        props:{
            topic: String,
            topicSplit: {
                type: String
            },
            serialNumber: {
                type: String
            }
        },
        data: {

        },
        mounted: function () {

        },
        methods: {

        }
    }
    global.questions = questions;
})(this);