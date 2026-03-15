export const battleTemplate = `<div id="battle" class="battle screen">
    <div id="victory" class="message">
        <div class="message-content victory">
            <img src="/assets/static/victory.png" alt="" />
            <h1>Победа!</h1>
        </div>
    </div>
    <div id="fail" class="message">
        <div class="message-content fail">
            <img src="/assets/static/fail.jpg" alt="" />
            <h1>Поражение!</h1>
        </div>
    </div>
    <div class="field">
        <div class="hand"></div>
        <div class="deck-block">
            <div class="card deck show" id="deck">
                <span class="card-name">Колода</span>
                <span class="card-value">0</span>
            </div>
        </div>
    </div>
    <div class="tools">
        <div id="steps" class="result steps"><span>0</span></div>
        <div id="play-cards"><button class="button">Сделать ход!</button></div>
        <div id="reset-cards"><button class="button alert">Сброс</button></div>
        <div id="resets" class="result resets"><span>0</span></div>
    </div>
</div>`